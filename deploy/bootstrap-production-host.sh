#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

export LC_ALL=C
SUPPORTED_UBUNTU_VERSION='22.04'
SUPPORTED_ACRHITECTYRE='amd64'
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPOSITORY_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
SOURCE_COMPOSE_FILE="$REPOSITORY_ROOT/docker-compose.deploy.yml"
SOURCE_ENV_EXAMPLE="$REPOSITORY_ROOT/deploy/.env.example"
SOURCE_DEPLOY_SCRIPT="$REPOSITORY_ROOT/deploy/deploy-production.sh"
DEPLOY_LOCK='/run/lock/insightfulphish-production.lock'
DOCKER_KEYRING='/etc/apt/keyrings/docker.asc'
DOCKER_SOURCE='/etc/apt/sources.list.d/docker.sources'
DEPLOY_USER='insightful-deploy'
DEPLOY_HOME='/home/insightful-deploy'
DEPLOY_SSH_DIR="$DEPLOY_HOME/.ssh"
DEPLOY_AUTHORISED_KEYS="$DEPLOY_SSH_DIR/authorized_keys"
APP_ROOT='/var/www/insightfulphish'
APP_DIR="$APP_ROOT/app"
DEPLOY_DIR="$APP_DIR/deploy"
TARGET_COMPOSE_FILE="$APP_DIR/docker-compose.deploy.yml"
TARGET_ENV_EXAMPLE="$DEPLOY_DIR/.env.example"
DEPLOY_ENTRYPOINT='/usr/local/bin/deploy-insightfulphish-production'
SUDOERS_FILE='/etc/sudoers.d/insightfulphish-production-deploy'

temporary_file=''

cleanup() {
	local exit_status=$?
	trap - EXIT
	if [[ -n "$temporary_file" && -e "$temporary_file" ]]; then 
		rm -f -- "$temporary_file" || true
	fi
	exit "$exit_status"
}

trap cleanup EXIT

fail() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

validate_bootstrap(){
	if (($# != 0)); then
		printf 'Usage: sudo %s\n' "${0##*/}" >&2
		exit 64
	fi
	if ((EUID != 0)); then
		fail 'Run this script as root with sudo'
	fi

	if [[ ! -f /etc/os-release ]]; then 
		fail 'The production host does not provide /etc/os-release'
	fi

	local os_id
	local os_version_id

	. /etc/os-release
	os_id="${ID:-}"
	os_version_id="${VERSION_ID:-}"

	if [[ "$os_id" != 'ubuntu' ]]; then
		fail "Unsupported operating system: ${os_id:-unkown}. Ubunty is required"
	fi
	if [[ "$os_version_id" != "$SUPPORTED_UBUNTU_VERSION" ]]; then
		fail "Unsupported ubuntu version: ${os_version_id:-unkown}. Ubuntu $SUPPORTED_UBUNTU_VERSION is required"
	fi

	local host_architecture
	host_architecture="$(dpkg --print-architecture)"

	if [[ "$host_architecture" != "$SUPPORTED_ACRHITECTYRE" ]]; then
		fail "Unsupported architecture: $host_architecture. $SUPPORTED_ACRHITECTYRE is required"
	fi

	local repository_file
	local -a repository_files=("$SOURCE_COMPOSE_FILE" "$SOURCE_ENV_EXAMPLE" "$SOURCE_DEPLOY_SCRIPT")

	for repository_file in "${repository_files[@]}"; do
		if [[ ! -f "$repository_file" ]]; then 
			fail "Required repository source is missing: $repository_file"
		fi
	done
}

acquire_deployment_lock() {
	if ! command -v flock >/dev/null 2>&1; then 
		fail 'flock is required to coordinate bootstrap and production deployment'
	fi
	exec 9>"$DEPLOY_LOCK"

	if ! flock -n 9; then
		printf 'Another production deployment or host bootstrap is already running\n' >&2
		exit 75
	fi
}

prepare_docker_host(){
	if ! command -v systemctl >/dev/null 2>&1; then 
		fail 'systemctl is required to manage docker services'
	fi

	apt-get update 
	DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl sudo

	if command -v docker >/dev/null 2>&1; then 
		if ! docker compose version >/dev/null 2>&1; then 
			fail 'Docker is installed, but the Docker Compose plugin is not available'
		fi

		systemctl enable --now docker

		if ! docker info >/dev/null 2>&1; then 
			fail 'Docker is installed, but the docker daemon is not available'
		fi

		printf 'Existing Docker Engine and Compose plugin installation is ready\n'
		return 0
	fi

	. /etc/os-release

	local ubuntu_codename 
	ubuntu_codename="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
	if [[ -z "$ubuntu_codename" ]]; then 
		fail 'The Ubuntu package codename is unavailable.'
	fi

	install -d -o root -g root -m 0755 /etc/apt/keyrings
	temporary_file="$(mktemp)"
	curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --output  "$temporary_file" https://download.docker.com/linux/ubuntu/gpg 

	install -o root -g root -m 0644 "$temporary_file" "$DOCKER_KEYRING"
	rm -f -- "$temporary_file"
	temporary_file=''

	install -o root -g root -m 0644 /dev/null "$DOCKER_SOURCE"
	printf '%s\n' 'Types: deb' 'URIs: https://download.docker.com/linux/ubuntu' "Suites: $ubuntu_codename" 'Components: stable' "Architectures: $SUPPORTED_ACRHITECTYRE" "Signed-By: $DOCKER_KEYRING" > "$DOCKER_SOURCE"

	apt-get update 
	DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 

	systemctl enable --now docker

	if ! docker compose version >/dev/null 2>&1; then 
		fail 'Docker was installed, but the Docker Dompose plugin is unavailable'
	fi

	if ! docker info >/dev/null 2>&1; then 
		fail 'Docker was installed, but the Docker daemon is unavailable'
	fi

}

prepare_deployment_account(){
	local account_details
	if account_details="$(getent passwd "$DEPLOY_USER")"; then
		local home_dir
		local login_shell 

		IFS=: read -r _ _ _ _ _ home_dir login_shell <<< "$account_details"

		if [[ $home_dir != "$DEPLOY_HOME" ]]; then 
			fail "Deployment account has unexpected home directory: $home_dir"
		fi
		if [[ "$login_shell" != '/bin/bash' ]]; then 
			fail "Deployment account has unexpected login shell: $login_shell"
		fi
	else
		useradd --create-home --home-dir "$DEPLOY_HOME" --shell /bin/bash --user-group "$DEPLOY_USER"
	fi
	passwd --lock "$DEPLOY_USER" >/dev/null

	local group_name 
	for group_name in $(id -nG "$DEPLOY_USER"); do
		if [[ "$group_name" == 'docker' ]]; then 
			fail 'The deployment account must not belong to the docker group'
		fi
	done

	if [[ -L "$DEPLOY_HOME" || -L "$DEPLOY_SSH_DIR" ]]; then
		fail 'Deployment home and SSH directories must not be symbolic links'
	fi
	if [[ -e "$DEPLOY_HOME" && ! -d "$DEPLOY_HOME" ]]; then
		fail "Deployment home is not a directory: $DEPLOY_HOME"
	fi
	if [[ -e "$DEPLOY_SSH_DIR" && ! -d "$DEPLOY_SSH_DIR" ]]; then
		fail "Deployment SSH path is not a directory: $DEPLOY_SSH_DIR"
	fi

	install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0750 "$DEPLOY_HOME"
	install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0700 "$DEPLOY_SSH_DIR"

	if [[ -L "$DEPLOY_AUTHORISED_KEYS" ]]; then
		fail "Deployment authorized_keys must not be a symbolic link: $DEPLOY_AUTHORISED_KEYS"
	fi
	if [[ -e "$DEPLOY_AUTHORISED_KEYS" && ! -f "$DEPLOY_AUTHORISED_KEYS" ]]; then
		fail "Deployment authorized_keys is not a regular file: $DEPLOY_AUTHORISED_KEYS"
	fi

	if [[ ! -e "$DEPLOY_AUTHORISED_KEYS" ]]; then
		install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0600 /dev/null "$DEPLOY_AUTHORISED_KEYS"
	else
		chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_AUTHORISED_KEYS"
		chmod 0600 "$DEPLOY_AUTHORISED_KEYS"
	fi
}

install_production_contract(){
	local production_directory
	local -a production_directories=(/var/www "$APP_ROOT" "$APP_DIR" "$DEPLOY_DIR")
	for production_directory in "${production_directories[@]}"; do
		if [[ -L "$production_directory" ]]; then
			fail "Production directory must not be a symbolic link: $production_directory"
		fi
		if [[ -e "$production_directory" && ! -d "$production_directory" ]]; then
			fail "Production path is not a directory: $production_directory"
		fi
	done

	install -d -o root -g root -m 0755 /var/www
	install -d -o root -g root -m 0755 "$APP_ROOT"
	install -d -o root -g root -m 0755 "$APP_DIR"
	install -d -o root -g root -m 0700 "$DEPLOY_DIR" 

	local managed_file
	local -a managed_files=("$TARGET_COMPOSE_FILE" "$TARGET_ENV_EXAMPLE" "$DEPLOY_ENTRYPOINT" "$SUDOERS_FILE")

	for managed_file in "${managed_files[@]}"; do
		if [[ -L "$managed_file" ]]; then
			fail "Managed production file must not be a symbolic link: $managed_file"
		fi
		if [[ -e "$managed_file" && ! -f "$managed_file" ]]; then
			fail "Managed production path is not a regular file: $managed_file"
		fi
	done

	install -o root -g root -m 0644 "$SOURCE_COMPOSE_FILE" "$TARGET_COMPOSE_FILE"
	install -o root -g root -m 0644 "$SOURCE_ENV_EXAMPLE" "$TARGET_ENV_EXAMPLE"
	install -o root -g root -m 0755 "$SOURCE_DEPLOY_SCRIPT" "$DEPLOY_ENTRYPOINT"

	if ! bash -n "$DEPLOY_ENTRYPOINT"; then
		fail 'The installed production deployment entrypoint has invalid Bash syntax'
	fi

	local sudoers_rule
	sudoers_rule="$DEPLOY_USER ALL=(root) NOPASSWD: $DEPLOY_ENTRYPOINT [0-9a-f]*"
	temporary_file="$(mktemp)"
	printf '%s\n' "$sudoers_rule" > "$temporary_file"
	chmod 0440 "$temporary_file"
	if ! visudo -cf "$temporary_file" >/dev/null; then
		fail 'The generated production sudoers rule is not valid'
	fi
	install -o root -g root -m 0440 "$temporary_file" "$SUDOERS_FILE"
	rm -f -- "$temporary_file" 
	temporary_file=''

}



main() {
	validate_bootstrap "$@"
	acquire_deployment_lock
	prepare_docker_host
	prepare_deployment_account
	install_production_contract

	printf 'Production host bootstrap completed. Complete the manual secret and ingress setup in deployment.md'
}

main "$@"
