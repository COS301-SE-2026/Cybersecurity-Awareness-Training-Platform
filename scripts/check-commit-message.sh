#!/usr/bin/env bash
set -e

COMMIT_MSG_FILE="$1"
COMMIT_SUBJECT="$(head -n 1 "$COMMIT_MSG_FILE")"

CO_AUTHOR_LINE="$(grep -i "^Co-authored-by:" "$COMMIT_MSG_FILE" | head -n 1)"

if [ -n "$CO_AUTHOR_LINE" ]; then
  echo "Commit message check failed: Contains Co-authored-by trailer."
  echo "Co-authored-by trailers are not allowed in this project."
  echo ""
  echo "Found this line:"
  echo "  $CO_AUTHOR_LINE"
  echo ""
  echo "Please remove it from the commit message."
  exit 1
fi


if ! echo "$COMMIT_SUBJECT" | grep -Eq "^(feat|fix|docs|chore): [^[:space:]].*"; then
  echo ""
  echo "Commit message check failed: Invalid format."
  echo ""
  echo "Commit messages must use exactly this format:"
  echo "  <type>: <description>"
  echo ""
  echo "Allowed types:"
  echo "  feat   - a new feature"
  echo "  fix    - a bug fix"
  echo "  docs   - documentation changes"
  echo "  chore  - maintenance, cleanup, or refactoring work"
  echo ""
  echo "Examples:"
  echo "  feat: add user authentication"
  echo "  fix: correct database health check"
  echo "  docs: update setup instructions"
  echo "  chore: set up repo foundation"
  echo ""
  echo "Scopes are not allowed."
  echo "Use:"
  echo "  feat: add login"
  echo "Not:"
  echo "  feat(auth): add login"
  echo ""
  echo "Your message was:"
  echo "  $COMMIT_SUBJECT"
  echo ""
  exit 1
fi

if [[ "$COMMIT_SUBJECT" == docs:\ * ]]; then
  STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMRD || true)"
  BLOCKED_DEVELOPMENT_FILES=()
  CORE_DEVELOPMENT_FILE_REGEX='(\.(ts|tsx|js|jsx|cjs|mjs|css|scss|html|json|jsonc|prisma|sql|sh|yml|yaml)$)'

  while IFS= read -r FILE; do
    if [[ -z "$FILE" || "$FILE" == *.md ]]; then
      continue
    fi

    if [[ "$FILE" =~ $CORE_DEVELOPMENT_FILE_REGEX ]] && \
      { [[ "$FILE" == apps/* ]] || [[ "$FILE" == packages/* ]] || [[ "$FILE" == scripts/* ]] || [[ "$FILE" == .github/workflows/* ]]; }; then
      BLOCKED_DEVELOPMENT_FILES+=("$FILE")
    fi
  done < <(printf '%s\n' "$STAGED_FILES")

  if [[ "${#BLOCKED_DEVELOPMENT_FILES[@]}" -gt 0 ]]; then
    echo ""
    echo "Commit message check failed: docs commit includes development files."
    echo ""
    echo "This commit is labelled as documentation, but it includes source, config, tooling, or workflow files."
    echo "Use feat:, fix:, or chore: if the commit includes development work."
    echo ""
    echo "Blocked files:"
    printf '  - %s\n' "${BLOCKED_DEVELOPMENT_FILES[@]}"
    echo ""
    echo "Allowed in docs: commits:"
    echo "  - Markdown documentation"
    echo "  - docs/ files"
    echo "  - images, screenshots, PDFs, diagrams, and other documentation assets"
    echo ""
    exit 1
  fi
fi
