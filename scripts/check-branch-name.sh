#!/usr/bin/env bash
set -e

WARN_ONLY=false

if [[ "${1:-}" = "--warn-only" ]]; then
  WARN_ONLY=true
fi

BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD)"

ALLOWED_BRANCHES=(
  "main"
  "dev"
)

ALLOWED_DEVELOPERS=(
  "FJNel"
  "RudolphLamp"
  "u24569608"
  "ZoeJ72005"
  "Adri4no098"
  "johan"
  "rudolph"
  "connor"
  "zoe"
  "adriano"
)

# Allow detached HEAD, which can happen in CI or special Git states.
if [[ "$BRANCH_NAME" = "HEAD" ]]; then
  exit 0
fi

for BRANCH in "${ALLOWED_BRANCHES[@]}"; do
  if [[ "$BRANCH_NAME" = "$BRANCH" ]]; then
    exit 0
  fi
done

DEVELOPER_PATTERN="$(IFS='|'; echo "${ALLOWED_DEVELOPERS[*]}")"
BRANCH_REGEX="^(feature|feat|docs|fix|chore)/[a-z0-9]+(-[a-z0-9]+)*/(${DEVELOPER_PATTERN})$"

if ! echo "$BRANCH_NAME" | grep -Eiq "$BRANCH_REGEX"; then
  echo ""
  echo "Branch name check failed: Invalid branch name."
  echo ""
  echo "Current branch:"
  echo "  $BRANCH_NAME"
  echo ""
  echo "Working branches must use exactly this format:"
  echo "  <type>/<description>/<developer>"
  echo ""
  echo "Allowed types:"
  echo "  feature - feature work"
  echo "  feat    - feature work (alternative)"
  echo "  docs    - documentation changes"
  echo "  fix     - bug fixes"
  echo "  chore   - maintenance, setup, tooling, or cleanup work"
  echo ""
  echo "Allowed developers:"
  printf '  - %s\n' "${ALLOWED_DEVELOPERS[@]}"
  echo ""
  echo "Examples:"
  echo "  feature/user-authentication/johan"
  echo "  feature/user-authentication/FJNel"
  echo "  docs/api-documentation/zoe"
  echo "  fix/login-issue/connor"
  echo "  chore/update-dependencies/adriano"
  echo ""
  echo "Use short, clear, lowercase words separated by hyphens for the description."
  echo ""
  echo "Allowed shared branches:"
  printf '  - %s\n' "${ALLOWED_BRANCHES[@]}"
  echo ""

  if [[ "$WARN_ONLY" = true ]]; then
    echo "This is a warning only because the check ran after switching branches."
    echo "Please rename the branch before committing or pushing."
    echo ""
    exit 0
  fi

  echo "Please rename the branch before committing or pushing."
  echo ""
  exit 1
fi