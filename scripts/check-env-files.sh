#!/usr/bin/env bash
set -e

STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR)"
ALLOWED_ENV_TEMPLATE=".env.example"

if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

BLOCKED_ENV_FILES=()

while IFS= read -r FILE; do
  BASENAME="$(basename "$FILE")"

  if [[ "$BASENAME" = "$ALLOWED_ENV_TEMPLATE" ]]; then
    continue
  fi

  # Block files named env or .env
  if [[ "$BASENAME" = "env" ]] || [[ "$BASENAME" = ".env" ]]; then
    BLOCKED_ENV_FILES+=("$FILE")
    continue
  fi

  # Block env-like files:
  # .env.local
  # .env.production
  # .env.test
  # .env.development
  # .env.anything
  # env.local
  # env.production
  # env.test
  # env.development
  #
  # Do not block source modules like env.ts.
  if [[ "$BASENAME" =~ ^\.env\..+ ]] || [[ "$BASENAME" =~ ^env\.(local|production|prod|development|dev|test|staging)$ ]]; then
    BLOCKED_ENV_FILES+=("$FILE")
    continue
  fi
done <<< "$STAGED_FILES"

if [[ "${#BLOCKED_ENV_FILES[@]}" -gt 0 ]]; then
  echo ""
  echo "Environment file check failed."
  echo ""
  echo "The following environment files must not be committed:"
  printf '  - %s\n' "${BLOCKED_ENV_FILES[@]}"
  echo ""
  echo "Only this environment template may be committed:"
  echo "  $ALLOWED_ENV_TEMPLATE"
  echo ""
  echo "Environment files often contain secrets, credentials, API keys, database URLs, tokens, or local machine-specific configuration."
  echo ""
  echo "Fix:"
  echo "  1. Unstage the blocked file(s):"
  echo "     git restore --staged <file>"
  echo ""
  echo "  2. Keep real environment values in local .env files only."
  echo ""
  echo "  3. If the project needs to document required variables, add them to:"
  echo "     $ALLOWED_ENV_TEMPLATE"
  echo ""
  exit 1
fi
