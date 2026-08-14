#!/usr/bin/env bash
set -Eeuo pipefail

export GIT_TERMINAL_PROMPT=0
export GIT_PAGER=cat
export PAGER=cat 
ZERO_SHA=0000000000000000000000000000000000000000

if [[ "$#" -lt 3 ]]; then # if less than three arguments passed in
	echo "Usage: ${##*/} <base-sha> <head-sha> <protected-directory> [<protected-directory> ...]" >&2
	exit 64;
fi

base_sha="$1"
head_sha="$2"
shift 2 
protected_directories=("$@")

if ! changed_files="$(git --no-pager diff --name-status --find-renames  --diff-filter=ACMRD "$base_sha" "$head_sha" -- "${protected_directories[@]}")"; then
	echo "Frozen documentation policy could not compare the required commits" >&2
	exit 2
fi

if [[ -z "$changed_files" ]]; then
	echo "Frozen documentation policy passed!"
	exit 0;
fi

echo "Frozen documentation policy failed"
echo "Documentation from previous demos may not be changed"
echo "Update documentation under the current Demo documentation folder instead"
exit 1;





