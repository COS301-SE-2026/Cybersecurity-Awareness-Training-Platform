#!/usr/bin/env bash
set -e

STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMRD || true)"
FROZEN_DOC_DIRS=(
	"docs/demo1"
)
CURRENT_DOC_DIR="docs/demo2"

if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

FROZEN_DEMO_FILES=()

while IFS= read -r FILE; do
  for FROZEN_DOC_DIR in "${FROZEN_DOC_DIRS[@]}"; do
    if [[ "$FILE" == "$FROZEN_DOC_DIR"/* ]]; then
	  FROZEN_DEMO_FILES+=("$FILE")
	  break
    fi
  done
done < <(printf '%s\n' "$STAGED_FILES")

if [[ "${#FROZEN_DEMO_FILES[@]}" -gt 0 ]]; then
  echo ""
  echo "Frozen documentation policy failed."
  echo "Frozen demo documentation must not be changed."
  echo "Copy or update content under $CURRENT_DOC_DIR instead."
  echo ""
  echo "Frozen directories:"
  printf '  - %s\n' "${FROZEN_DOC_DIRS[@]}"
  echo ""
  echo "Blocked files:"
  printf '  - %s\n' "${FROZEN_DEMO_FILES[@]}"
  echo ""
  exit 1
fi
