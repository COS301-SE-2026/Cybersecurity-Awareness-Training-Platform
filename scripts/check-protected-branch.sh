#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-commit}"
BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD)"

if [[ "$BRANCH_NAME" == "main" || "$BRANCH_NAME" == "dev" ]]; then
  echo ""
  echo "Direct $MODE on '$BRANCH_NAME' is not allowed."
  echo ""
  echo "Use a working branch instead:"
  echo "  git checkout -b feature/short-description/FJNel"
  echo "  git checkout -b docs/short-description/FJNel"
  echo "  git checkout -b fix/short-description/FJNel"
  echo "  git checkout -b chore/short-description/FJNel"
  echo ""
  echo "Then open a pull request into dev."
  echo ""
  exit 1
fi
