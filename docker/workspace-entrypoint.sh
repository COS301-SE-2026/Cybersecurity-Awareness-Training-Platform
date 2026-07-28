#!/bin/sh
set -eu

LOCAL_UID="${LOCAL_UID:-1000}"
LOCAL_GID="${LOCAL_GID:-1000}"

case "$LOCAL_UID:$LOCAL_GID" in
	*[!0-9:]* | :* | *: | *::*)
		echo "LOCAL_UID and LOCAL_GID must be numeric." >&2
		exit 1
		;;
	*)
		;;
esac

WORKSPACE_USER="workspace"
WORKSPACE_GROUP="workspace"
WORKSPACE_HOME="/home/$WORKSPACE_USER"

PNPM_HOME="${PNPM_HOME:-${WORKSPACE_HOME}/.local/share/pnpm}"
PNPM_STORE_DIR="${PNPM_STORE_DIR:-${WORKSPACE_HOME}/.pnpm-store}"

existing_group="$(getent group "$LOCAL_GID" | cut -d: -f1 || true)"
if [ -n "$existing_group" ]; then
	WORKSPACE_GROUP="$existing_group"
else
	addgroup -g "$LOCAL_GID" "$WORKSPACE_GROUP"
fi

existing_user="$(getent passwd "$LOCAL_UID" | cut -d: -f1 || true)"
if [ -n "$existing_user" ]; then
	WORKSPACE_USER="$existing_user"
	WORKSPACE_HOME="$(getent passwd "$LOCAL_UID" | cut -d: -f6)"
else
	adduser -D -H -u "$LOCAL_UID" -G "$WORKSPACE_GROUP" "$WORKSPACE_USER"
	mkdir -p "$WORKSPACE_HOME"
fi

mkdir -p \
	"$WORKSPACE_HOME" \
	"$PNPM_HOME" \
	"$PNPM_STORE_DIR" \
	/workspace/node_modules \
	/workspace/apps/backend/node_modules \
	/workspace/apps/frontend/node_modules \
	/workspace/packages/shared/node_modules

chown -R "$LOCAL_UID:$LOCAL_GID" \
	"$WORKSPACE_HOME" \
	"$PNPM_HOME" \
	"$PNPM_STORE_DIR" \
	/workspace/node_modules \
	/workspace/apps/backend/node_modules \
	/workspace/apps/frontend/node_modules \
	/workspace/packages/shared/node_modules

export HOME="$WORKSPACE_HOME"
export PNPM_HOME
export PNPM_STORE_DIR
export PNPM_CONFIG_STORE_DIR="$PNPM_STORE_DIR"
export PATH="$PNPM_HOME:$PATH"

exec su-exec "$LOCAL_UID:$LOCAL_GID" "$@"
