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

	if ! command -v bash >/dev/null 2>&1; then
		fail 'Bash is required to install the production deployment script'
	fi
	if ! command -v dpkg >/dev/null 2>&1; then
		fail 'dpkg is required to deviry the production host architecture'
	fi
	if [[ ! -f /etc/os-release ]]; then 
		fail 'The production host does not provide /etc/os-release'
	fi

	local ID=''
	local VERSION_ID=''

	. /etc/os-release

	if [[ "$ID" != 'ubuntu' ]]; then
		fail "Unsupported operating system: ${ID:-unkown}. Ubunty is required"
	fi
	if [[ "$VERSION_ID" != "$SUPPORTED_UBUNTU_VERSION" ]]; then
		fail "Unsupported ubuntu version: ${VERSION_ID:-unkown}. Ubuntu $SUPPORTED_UBUNTU_VERSION is required"
	fi

	local host_architecture
	host_architecture="$(dpkg --print-architecture)"

	if [[ "$host_architecture" != "$SUPPORTED_ACRHITECTYRE" ]]; then
		fail "Unsupported architecture: $host_architecture. $SUPPORTED_ACRHITECTYRE is required"
	fi

	local repository_file
	local -a repository_files=("$SOURCE_COMPOSE_FILE" "$SOURCE_ENV_EXAMPLE" "$SOURCE_DEPLOY_SCRIPT")

	for repository_file in "${repository_files[@]}"; do
		if [[ -L "$repository_file" ]]; then 
			fail "Repository source must not be a symbolic link: $repository_file"
		fi
		if [[ ! -f "$repository_file" ]]; then 
			fail "Required repository source is missing: $repository_file"
		fi
	done

	if ! bash -n "$SOURCE_DEPLOY_SCRIPT"; then 
		fail "The repository production deployment script has invalid syntax"
	fi
}

acquire_deployment_lock() {
	if ! command -v flock >/dev/null 2>&1; then 
		fail 'flock is required to coordinate bootstrap and production deployment'
	fi
	if [[ -L "$DEPLOY_LOCK" ]]; then 
		fail "Production deployment lock must not be a symbolic link: $DEPLOY_LOCK"
	fi
	if [[ -e "$DEPLOY_LOCK" && ! -f "$DEPLOY_LOCK" ]]; then 
		fail "Production deployment lock is not a regular file: $DEPLOY_LOCK"
	fi
	exec 9>"$DEPLOY_LOCK"

	if ! flock -n 9; then
		printf 'Another production deployment or host bootstrap is already running\n' >&2
		exit 75
	fi
}

is_package_installed(){
	local package_name="$1"
	local package_status 

	if ! package_status="$(dpkg-query -W -f='${Status}' "$package_name" 2>/dev/null)"; then
		return 1
	fi
	if [[ "$package_status" != 'install ok installed' ]]; then
		return 1
	fi 
	return 0
}

prepare_docker_host(){
	if ! command -v apt-get >/dev/null 2>&1; then
		fail 'apt-get is required to install host prodction dependencies'
	fi
	if ! command -v dpkg-query >/dev/null 2>&1; then 
		fail 'dpkg-query is required to inspect host prodction dependencies'
	fi
	if ! command -v systemctl >/dev/null 2>&1; then 
		fail 'systemctl is required to manage docker services'
	fi

	local package_name 
	local -a missing_packages=()
	local -a required_packages=(ca-certificates curl sudo util-linux)

	for package_name in "${required_packages[@]}"; do 
		if ! is_package_installed "$package_name"; then 
			missing_packages+=("$package_name")
		fi
	done 

	if ((${#missing_packages[@]} > 0)); then
		apt-get update
		DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing_packages[@]}"
	fi

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

	local -a docker_packages=(docker-ce docker-ce-cli docker.io docker-compose-plugin containerd.io docker-buildx-plugin)

	for package_name in "${docker_packages[@]}"; do 
		if is_package_installed "$package_name"; then
			fail "A partial Docker installation exists: $package_name"
		fi
	done

	if [[ -e "$DOCKER_KEYRING" || -L "$DOCKER_KEYRING" || -e "$DOCKER_SOURCE" || -L "$DOCKER_SOURCE" ]]; then 
		fail 'Partial Docker apt repository config already exists. Review it before rerunning this bootstrap'
	fi

	local VERSION_CODENAME=''
	local UBUNTU_CODENAME=''

	. /etc/os-release

	local ubuntu_codename 
	ubuntu_codename="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
	if [[ -z "$ubuntu_codename" ]]; then 
		fail 'The Ubuntu package codename is unavailable.'
	fi

	install -d -o root -g root -m 0755 /etc/apt/keyrings
	temporary_file="$(mktemp)"
	curl --fail --silent --show-error --location https://download.docker.com/linux/ubuntu/gpg --output "$temporary_file"

	if [[ ! -s "$temporary_file" ]]; then 
		fail 'The downloaded Docker repository signing key is empty'
	fi
	install -o root -g root -m 0644 "$temporary_file" "$DOCKER_KEYRING"
	rm -f -- "$temporary_file"
	temporary_file=''

	install -o root -g root -m 0644 /dev/null "$DOCKER_SOURCE"
	printf '%s\n' 'Types: deb' 'URIs: https://download.docker.com/linux/ubuntu' "Suites: $ubuntu_codename" 'Components: stable' "Architectures:$SUPPORTED_ACRHITECTYRE" "Signed-By: $DOCKER_KEYRING" > "$DOCKER_SOURCE"

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

main() {
	validate_bootstrap "$@"
	acquire_deployment_lock
	prepare_docker_host

	printf 'Production Docker host prerequisites are ready\n'
}

main "$@"
