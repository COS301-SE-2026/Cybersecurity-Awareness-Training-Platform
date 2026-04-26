#!/usr/bin/env bash
set -e

COMMIT_MSG_FILE="$1"
COMMIT_SUBJECT="$(head -n 1 "$COMMIT_MSG_FILE")"
STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR || true)"

HAS_MD=false

while IFS= read -r FILE; do
  if [[ "$FILE" == *.md ]]; then
    HAS_MD=true
    break
  fi
done <<< "$STAGED_FILES"

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

if [ "$HAS_MD" = true ] && ! echo "$COMMIT_SUBJECT" | grep -Eq "^docs: [^[:space:]].*"; then
  echo ""
  echo "Commit message check failed: Documentation commit must use 'docs' type."
  echo ""
  echo "This commit includes Markdown documentation files."
  echo "Documentation commits must use the docs type:"
  echo "  docs: appropriate message"
  echo ""
  echo "This helps keep documentation-only work separate from code work for Hyperperform tracking."
  echo ""
  echo "Currently staged Markdown files:"
  echo "$STAGED_FILES" | grep '\.md$' | sed 's/^/  - /'
  echo ""
  exit 1
fi