#!/usr/bin/env bash
set -e

STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR || true)"

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

HAS_MD=false
HAS_CODE=false
HAS_OTHER=false

DOC_ALLOWED_REGEX='(^README\.md$|^GITHUB RULES\.md$|^docs/|\.md$|^Images/)'
CODE_REGEX='(\.(ts|tsx|js|jsx|cjs|mjs|css|scss|html|json|jsonc|prisma|sql|sh|yml|yaml)$|^apps/|^packages/|^scripts/|^\.github/workflows/)'

while IFS= read -r FILE; do
  if [[ "$FILE" == *.md ]]; then
    HAS_MD=true
  fi

  if [[ "$FILE" =~ $CODE_REGEX ]]; then
    HAS_CODE=true
  fi

  if [[ ! "$FILE" =~ $DOC_ALLOWED_REGEX && ! "$FILE" =~ $CODE_REGEX ]]; then
    HAS_OTHER=true
  fi
done <<< "$STAGED_FILES"

if [ "$HAS_MD" = true ] && [ "$HAS_CODE" = true ]; then
  echo ""
  echo "Documentation files (.md) and code/config files are staged together."
  echo ""
  echo "Documentation files and code/config files are staged together."
  echo "Please split this into separate commits so Hyperperform can track code contributions more accurately."
  echo ""
  echo "Suggested split:"
  echo "  1. docs: update documentation"
  echo "  2. feat/fix/chore: appropriate message"
  echo ""
  echo "Currently staged files:"
  echo "$STAGED_FILES" | sed 's/^/  - /'
  echo ""
  exit 1
fi