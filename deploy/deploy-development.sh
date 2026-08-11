#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$#" -ne 1 ]]; then
	echo "Usage: ${0##*/} <40-character-sha>" >&2
	exit 64
fi
if [[ ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
	echo "Release SHA should be 40 characters" >&2
	exit 64
fi
exec /usr/local/libexec/insightfulphish/deploy.sh --target development "$1"

