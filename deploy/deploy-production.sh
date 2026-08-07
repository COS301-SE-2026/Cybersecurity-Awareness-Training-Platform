#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

IMAGE_PREFIX='ghcr.io/cos301-se-2026/cybersecurity-awareness-training-platform'
BACKEND_HEALTH_URL='http://127.0.0.1:4000/health'
FRONTEND_HEALTH_URL='http://127.0.0.1:5173/'
HEALTH_ATTEMPTS=24
HEALTH_RETRY_SECONDS=5

phase='argument-validation'
temporary_file=''

finish() {
	local status=$?
	trap - EXIT
	if [[ -n "$temporary_file" && -e "$temporary_file" ]]; then
		rm -f "$temporary_file"
	fi

	if ((status != 0)); then
		echo "Deployment failed during phase: $phase" >&2
		if [[ -n "${CURRENT_FILE:-}" && -f "${CURRENT_FILE:-}" ]]; then
			echo "Current successful SHA: $(cat "$CURRENT_FILE")" >&2
		else
			echo "No current successful SHA has been recorded" >&2
		fi
		if [[ "$phase" == "migration" || "$phase" == "application-recreation" || "$phase" == "health-checks" || "$phase" == "smoke-tests" ]]; then
			echo "The migration may have changed the database. Do not roll back automatically without confirming DB compatibility." >&2
		fi
	fi

	exit "$status"
}

trap finish EXIT

deployment_target='production'

case "$#" in
	1)
		release_sha="$1"
		;;
	3) 
		if [[ "$1" != '--target' ]]; then
			echo "Usage: ${0##*/} [--target production|development] <40-character-sha>" >&2
			exit 64
		fi
		deployment_target="$2"
		release_sha="$3"
		;;
	*)
		echo "Usage: ${0##*/} [--target production|development] <40-character-sha>" >&2
		exit 64
		;;
esac

if [[ ! "$release_sha" =~ ^[0-9a-f]{40}$ ]]; then
	echo "Release SHA must be 40 lowercase characters" >&2
	exit 64
fi

case "$deployment_target" in 
	production)
		APP_DIR='/var/www/insightfulphish/app'
		LOCK_FILE='/run/lock/insightfulphish-production.lock'
		image_tag="$release_sha"
		COMPOSE_FILES=("$APP_DIR/docker-compose.deploy.yml")
		pull_services=(backend backend-migrate frontend)
		application_services=(postgres backend frontend)
		;;
	development)
		APP_DIR='/var/www/insightfulphish-dev'
		LOCK_FILE='/run/lock/insightfulphish-development.lock'
		image_tag="dev-$release_sha"
		COMPOSE_FILES=("$APP_DIR/docker-compose.deploy.yml" "$APP_DIR/docker-compose.development.yml")
		pull_services=(backend backend-migrate frontend mailpit)
		application_services=(postgres mailpit backend frontend)
		;;
	*)
		echo "Deployment target must be production or development" >&2
		exit 64
		;;
esac

RUNTIME_ENV="$APP_DIR/deploy/.env"
RELEASE_ENV="$APP_DIR/deploy/release.env"
CANDIDATE_ENV="$APP_DIR/deploy/release.next.env"
RELEASES_DIR="$APP_DIR/deploy/releases"
CURRENT_FILE="$RELEASES_DIR/current"
PREVIOUS_FILE="$RELEASES_DIR/previous"
HISTORY_FILE="$RELEASES_DIR/deployment-history.log"
backend_image="$IMAGE_PREFIX/backend:$image_tag"
frontend_image="$IMAGE_PREFIX/frontend:$image_tag"

phase="deployment-lock"

exec 9>"$LOCK_FILE"

if ! flock -n 9; then
	echo "Another deployment is already running" >&2
	exit 75
fi

phase="required-file-validation"

if [[ ! -d "$APP_DIR" ]]; then
	echo "Application directory does not exist: $APP_DIR" >&2
	exit 1
fi

for compose_file in "${COMPOSE_FILES[@]}"; do 
	if [[ ! -f "$compose_file" ]]; then
		echo "Compose file does not exit: $compose_file" >&2
		exit 1
	fi
done


if [[ ! -f "$RUNTIME_ENV" ]]; then
	echo "Runtime env file does not exist: $RUNTIME_ENV" >&2
	exit 1
fi

install -d -o root -g root -m 700 "$RELEASES_DIR"

phase="candidate-release-file"
temporary_file="$(mktemp "$APP_DIR/deploy/.release.next.env.XXXXXX")"
chmod 600 "$temporary_file"
chown root:root "$temporary_file"

printf '%s\n' "BACKEND_IMAGE=$backend_image" "FRONTEND_IMAGE=$frontend_image" "DEPLOYED_SHA=$release_sha" > "$temporary_file"

mv -f "$temporary_file" "$CANDIDATE_ENV"
temporary_file=""
chmod 600 "$CANDIDATE_ENV"
chown root:root "$CANDIDATE_ENV"

compose_candidate=(docker compose --env-file "$RUNTIME_ENV" --env-file "$CANDIDATE_ENV")
for compose_file in "${COMPOSE_FILES[@]}"; do
	compose_candidate+=(-f "$compose_file")
done

phase="compose-validation"

"${compose_candidate[@]}" config --quiet

phase="image-pull"

"${compose_candidate[@]}" pull "${pull_services[@]}"

phase="migration"
"${compose_candidate[@]}" --profile migration run --rm backend-migrate

phase="application-recreation"

"${compose_candidate[@]}" up -d --no-build --remove-orphans "${application_services[@]}"

service_is_healthy() {
	local service_name="$1"
	local container_id
	local health_status

	container_id="$("${compose_candidate[@]}" ps -q "$service_name")"
	if [[ -z "$container_id" ]]; then
		return 1
	fi

	health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null)"

	[[ "$health_status" == "healthy" ]]
}

wait_for_service_health() {
	local service_name="$1"
	local attempt 

	for((attempt=1; attempt<=HEALTH_ATTEMPTS; attempt+=1)); do 
		if service_is_healthy "$service_name"; then
			echo "$service_name is healthy"
			return 0
		fi 
		if (( attempt<HEALTH_ATTEMPTS)); then
			sleep "$HEALTH_RETRY_SECONDS"
		fi
	done 
	echo "$service_name did not become healthy within the allowed time!">&2
	"${compose_candidate[@]}" ps >&2
	return 1
}

phase="health-checks"
"${compose_candidate[@]}" ps
wait_for_service_health backend
wait_for_service_health frontend

wait_for_http(){
	local service_name="$1"
	local url="$2"
	local attempt

	for((attempt=1; attempt<=HEALTH_ATTEMPTS; attempt+=1)); do 
		if curl --fail --silent --show-error "$url" >/dev/null; then
			echo "$service_name passed HTTP smoke test"
			return 0
		fi 
		if (( attempt<HEALTH_ATTEMPTS)); then
			sleep "$HEALTH_RETRY_SECONDS"
		fi
	done 

	echo "$service_name did NOT pass the HTTP smoke test: $url" >&2
	return 1
}

phase="smoke-tests"
wait_for_http backend "$BACKEND_HEALTH_URL"
wait_for_http frontend "$FRONTEND_HEALTH_URL"
if [[ "$deployment_target" == 'development' ]]; then
	echo "Checking backend to mailpit connectivity"
	"${compose_candidate[@]}" exec -T backend node -e '
	const net = require("node:net");
	const socket = net.createConnection({ host: "mailpit", port: 1025 });
	socket.setTimeout(5000);
	socket.once("connect", () => {
		socket.destroy();
		process.exit(0);
	});
	socket.once("timeout", () => {
		console.error("Mailpit connection timed out");
		socket.destroy();
		process.exit(1);
	});
	socket.once("error", (error) => {
		console.error("Mailpit connection failed: " + error.message);
		socket.destroy();
		process.exit(1);
	});
	'
	echo "Backend can reach mailpit"
fi

phase="release-state-validation"
current_sha=""
previous_sha=""

if [[ -f "$CURRENT_FILE" ]]; then
	current_sha="$(<"$CURRENT_FILE")"
	if [[ -n "$current_sha" && ! "$current_sha" =~ ^[0-9a-f]{40}$ ]]; then
		echo "Existing (current) release marker is NOT valid" >&2
		exit 1
	fi
fi 
if [[ -n "$current_sha" && "$current_sha" != "$release_sha" ]]; then
	previous_sha="$current_sha"
elif [[ -f "$PREVIOUS_FILE" ]]; then
	previous_sha="$(<"$PREVIOUS_FILE")"
	if [[ -n "$previous_sha" && ! "$previous_sha" =~ ^[0-9a-f]{40}$ ]]; then
		echo "Existing (previous) release marker is NOT valid" >&2
		exit 1
	fi
fi

phase="release-promotion"

mv -f "$CANDIDATE_ENV" "$RELEASE_ENV"
chmod 600 "$RELEASE_ENV"
chown root:root "$RELEASE_ENV"

temporary_file="$(mktemp "$RELEASES_DIR/.previous.XXXXXX")"
printf '%s\n' "$previous_sha" > "$temporary_file"
chmod 600 "$temporary_file"
chown root:root "$temporary_file"
mv -f "$temporary_file" "$PREVIOUS_FILE"
temporary_file=""

temporary_file="$(mktemp "$RELEASES_DIR/.current.XXXXXX")"
printf '%s\n' "$release_sha" > "$temporary_file"
chmod 600 "$temporary_file"
chown root:root "$temporary_file"
mv -f "$temporary_file" "$CURRENT_FILE"
temporary_file=""

deployment_timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
printf '%s %s success previous=%s target=%s\n' "$deployment_timestamp" "$release_sha" "${previous_sha:-none}" "$deployment_target" >> "$HISTORY_FILE"

chmod 600 "$CURRENT_FILE" "$PREVIOUS_FILE" "$HISTORY_FILE"
chown root:root "$CURRENT_FILE" "$PREVIOUS_FILE" "$HISTORY_FILE"

phase="complete"

echo "Deployment completed successfully"
echo "Deployment target: $deployment_target"
echo "Deployed SHA: $release_sha"
echo "Previous SHA: ${previous_sha:-none}"
