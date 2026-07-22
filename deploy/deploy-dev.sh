#!/user/bin/env bash
set -Eueo pipefail

APP_DIR='var/www/insightfulphish/app'
COMPOSE_FILE='$APP_DIR/docker-compose.deploy.yml'
RUNTIME_ENV='$APP_DIR/deploy/.env'
RELEASE_ENV='$APP_DIR/deploy/release.env'
CANDIDATE_ENV='$APP_DIR/deploy/release.next.env'
RELEASES_DIR='$APP_DIR/deploy/releases'
CURRENT_FILE='$RELEASES_DIR/current'
PREVIOUS_FILE='$RELEASES_DIR/previous'
HISTORY_FILE='$RELEASES_DIR/deployment-history.log'
IMAGE_PREFIX='ghcr.io/cos301-se-2026/cybersecurity-awareness-training-platform'
LOCK_FILE='run/lock/insightfulphish-dev.lock'
BACKEND_HEALTH_URL='http://127.0.0.1:4000/health'
FRONTEND_HEALTH_URL='http://127.0.0.1:5173/'
HEALTH_ATTEMPTS=10
HEALTH_RETRY_SECONDS=5

phase='argument-validation'
temporary_file=''
