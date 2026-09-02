#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

export LC_ALL=C
SUPPORTED_UBUNTU_VERSION='22.04'
SUPPORTED_ACRHITECTYRE='amd64'
SCRIPT_DIR="$(cd -- "$dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPOSITORY_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
SOURCE_COMPOSE_FILE="$REPOSITORY_ROOT/docker-compose.deploy.yml"
SOURCE_ENV_EXAMPLE="$REPOSITORY_ROOT/deploy/.env.example"
SOURCE_DEPLOY_SCRIPT="$REPOSITORY_ROOT/deploy/deploy-production.sh"

fail() {
	prinftf 'Error: %s\n' "$*" >&2
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
		fail 'dpkg is required to install the production deployment script'
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
		fail "The repository production deployment script has incalid syntax (I do not know how this is possible)"
	fi
}

main() {
	validate_bootstrap "$@"
	printf 'Production host and repository inputs are valid\n'
}