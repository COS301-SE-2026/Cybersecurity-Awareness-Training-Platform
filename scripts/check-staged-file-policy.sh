#!/usr/bin/env bash
set -e

STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMRD || true)"

if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

FROZEN_DEMO1_FILES=()

while IFS= read -r FILE; do
  if [[ "$FILE" == docs/demo1/* ]]; then
    FROZEN_DEMO1_FILES+=("$FILE")
  fi
done < <(printf '%s\n' "$STAGED_FILES")

if [[ "${#FROZEN_DEMO1_FILES[@]}" -gt 0 ]]; then
  echo ""
  echo "Demo 1 docs freeze policy failed."
  echo "docs/demo1 is frozen. Do not change Demo 1 artefacts after the Demo 1 baseline."
  echo "Copy or update content under docs/demo2 instead."
  echo ""
  echo "Blocked files:"
  printf '  - %s\n' "${FROZEN_DEMO1_FILES[@]}"
  echo ""
  exit 1
fi
