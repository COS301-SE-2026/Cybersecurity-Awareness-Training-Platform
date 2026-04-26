#!/usr/bin/env bash
set -e

GIT_NAME="$(git config user.name || true)"
GIT_EMAIL="$(git config user.email || true)"

ALLOWED_USERS=(
  "FJNel"
  "RudolphLamp"
  "u24569608"
  "ZoeJ72005"
  "Adri4no098"
)

if [ -z "$GIT_NAME" ]; then
  echo ""
  echo "Git identity check failed."
  echo "Git user.name is not configured."
  echo ""
  echo "For this project, user.name must match your GitHub username."
  echo "Fix it with:"
  echo "  git config --global user.name \"your-github-username\""
  echo ""
  exit 1
fi

if [ -z "$GIT_EMAIL" ]; then
  echo ""
  echo "Git identity check failed."
  echo "Git user.email is not configured."
  echo ""
  echo "Set it to an email address linked to your GitHub account."
  echo "Fix it with:"
  echo "  git config --global user.email \"your-github-email\""
  echo ""
  exit 1
fi

if [ "$GIT_NAME" = "your-github-username" ] || \
   [ "$GIT_EMAIL" = "github@email.com" ] || \
   [ "$GIT_EMAIL" = "your-github-email" ]; then

  echo ""
  echo "Git identity check failed."
  echo "Your Git identity still contains a placeholder value."
  echo ""
  echo "Current values:"
  echo "  user.name:  $GIT_NAME"
  echo "  user.email: $GIT_EMAIL"
  echo ""
  echo "Fix it with:"
  echo "  git config --global user.name \"your-github-username\""
  echo "  git config --global user.email \"your-github-email\""
  echo ""
  exit 1
fi

USER_ALLOWED=false

for USER in "${ALLOWED_USERS[@]}"; do
  if [ "$GIT_NAME" = "$USER" ]; then
    USER_ALLOWED=true
    break
  fi
done

if [ "$USER_ALLOWED" != true ]; then
  echo ""
  echo "Git identity check failed."
  echo "Git user.name must match one of the approved team GitHub usernames."
  echo ""
  echo "Current user.name:"
  echo "  $GIT_NAME"
  echo ""
  echo "Allowed usernames:"
  printf '  - %s\n' "${ALLOWED_USERS[@]}"
  echo ""
  echo "Fix it with:"
  echo "  git config --global user.name \"your-github-username\""
  echo ""
  exit 1
fi

if command -v gh >/dev/null 2>&1; then
  GH_USER="$(gh api user --jq .login 2>/dev/null || true)"

  if [ -n "$GH_USER" ] && [ "$GH_USER" != "$GIT_NAME" ]; then
    echo ""
    echo "Git identity check failed."
    echo "Your GitHub CLI account does not match your local Git user.name."
    echo ""
    echo "Current values:"
    echo "  git user.name: $GIT_NAME"
    echo "  gh login:      $GH_USER"
    echo ""
    echo "Either update Git config:"
    echo "  git config --global user.name \"$GH_USER\""
    echo ""
    echo "or log into the correct GitHub CLI account:"
    echo "  gh auth login"
    echo ""
    exit 1
  fi
fi

echo "Git identity check passed:"
echo "  user.name:  $GIT_NAME"
echo "  user.email: $GIT_EMAIL"