#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

IMAGE_PREFIX='ghcr.io/cos301-se-2026/cybersecurity-awareness-training-platform'
BACKEND_HEALTH_URL='http://127.0.0.1:4000/health'
FRONTEND_HEALTH_URL='http://127.0.0.1:5173/'
HEALTH_ATTEMPTS=24
HEALTH_RETRY_SECONDS=5
RESTORATION_FAILED_EVENT='restoration-failed'
# Note that all DB migrations must be backwards compatible

phase='argument-validation'
temporary_file=''
candidate_started=false
recovery_needed=false # containers need to be restored
previous_release_available=false
promotion_started=false # release files and markers need to be restored
active_compose=()

record_history(){
	local event="$1"

	if [[ -z "${HISTORY_FILE:-}" || ! -d "${RELEASES_DIR:-}" ]]; then
		return 0
	fi 

	printf '%s candidate=%s target=%s event=%s previous=%s phase=%s\n' \
		"$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
		"${release_sha:-unknown}" \
		"${deployment_target:-unknown}" \
		"$event" \
		"${current_sha:-none}" \
		"${phase:-unknown}" >> "$HISTORY_FILE"
}
finish() {
	local status=$?
	local failed_phase="$phase"
	 
	trap - EXIT

	if [[ -n "$temporary_file" && -e "$temporary_file" ]]; then
		rm -f "$temporary_file"
	fi

	if ((status != 0)); then
		echo "Deployment failed during phase: $failed_phase" >&2
		echo "Candidate SHA: ${release_sha:-unknown}" >&2
		echo "Current successful SHA: ${current_sha:-none}" >&2
		
		if [[ "$candidate_started" == true ]]; then
			phase="$failed_phase"
			if ! record_history 'candidate-failed'; then 
				echo "Candidate failure could not be written to deployment history" >&2
			fi
		fi

		if [[ "$promotion_started" == true && "$previous_release_available" == true ]]; then
			echo "Restoring previous successful release state" >&2
			if ! restore_previous_release_state; then
				echo "Previous successful release state could not be fully restored" >&2
			fi
		fi

		if [[ "$recovery_needed" == true && "$previous_release_available" == true ]]; then 
			echo "Restoring previous application release: $current_sha">&2

			if ! restore_previous_application; then 
				echo "Previous application restoration failed too" >&2
				report_running_images
			fi 
		elif [[ "$recovery_needed" == true ]]; then
			echo "No previous successful release available to restore" >&2
			report_running_images
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
RECOVERY_ENV="$APP_DIR/deploy/release.recovery.env"
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
		echo "Compose file does not exist: $compose_file" >&2
		exit 1
	fi
done

if [[ ! -f "$RUNTIME_ENV" ]]; then
	echo "Runtime env file does not exist: $RUNTIME_ENV" >&2
	exit 1
fi

install -d -o root -g root -m 700 "$RELEASES_DIR"

phase="current-release-validation"
current_sha=''
previous_sha=''
original_previous_sha=''

if [[ -f "$CURRENT_FILE" ]]; then
	current_sha="$(<"$CURRENT_FILE")"
	if [[ -n "$current_sha" && ! "$current_sha" =~ ^[0-9a-f]{40}$ ]]; then
		echo "Existing (current) release marker is NOT valid" >&2
		exit 1
	fi
fi

if [[ -n "$current_sha" ]]; then
	if [[ ! -f "$RELEASE_ENV" ]]; then 
		echo "Current release $current_sha has no release env file">&2
		exit 1
	fi
	if ! grep -Fxq "DEPLOYED_SHA=$current_sha" "$RELEASE_ENV"; then
		echo "Current release env does not match current SHA $current_sha" >&2
		exit 1
	fi
	if ! install -m 600 -o root -g root "$RELEASE_ENV" "$RECOVERY_ENV"; then
		echo "Current release env could not be preserved for recovery" >&2
		exit 1
	fi

	previous_release_available=true
	
fi

if [[ -f "$PREVIOUS_FILE" ]]; then
	original_previous_sha="$(<"$PREVIOUS_FILE")"
	if [[ -n "$original_previous_sha" && ! "$original_previous_sha" =~ ^[0-9a-f]{40}$ ]]; then
		echo "Existing previous release marker is not valid" >&2
		exit 1
	fi
fi

if [[ -n "$current_sha" && "$current_sha" != "$release_sha" ]]; then
	previous_sha="$current_sha"
else
	previous_sha="$original_previous_sha"
fi

phase="candidate-release-file"
temporary_file="$(mktemp "$APP_DIR/deploy/.release.next.env.XXXXXX")"
chmod 600 "$temporary_file"
chown root:root "$temporary_file"

printf '%s\n' "BACKEND_IMAGE=$backend_image" "FRONTEND_IMAGE=$frontend_image" "DEPLOYED_SHA=$release_sha" > "$temporary_file"

mv -f "$temporary_file" "$CANDIDATE_ENV"
temporary_file=""
chmod 600 "$CANDIDATE_ENV"
chown root:root "$CANDIDATE_ENV"
candidate_started=true
record_history 'candidate-started'

compose_candidate=(docker compose --env-file "$RUNTIME_ENV" --env-file "$CANDIDATE_ENV")
for compose_file in "${COMPOSE_FILES[@]}"; do
	compose_candidate+=(-f "$compose_file")
done
compose_previous=()
if [[ "$previous_release_available" == true ]]; then 
	compose_previous=(docker compose --env-file "$RUNTIME_ENV" --env-file "$RECOVERY_ENV")

	for compose_file in "${COMPOSE_FILES[@]}"; do
		compose_previous+=(-f "$compose_file")
	done

	phase="previous-compose-validation"
	"${compose_previous[@]}" config --quiet
	
fi

active_compose=("${compose_candidate[@]}")

phase="compose-validation"

"${compose_candidate[@]}" config --quiet

phase="image-pull"

"${compose_candidate[@]}" pull "${pull_services[@]}"

phase="migration"
"${compose_candidate[@]}" --profile migration run --rm backend-migrate

service_is_healthy() {
	local service_name="$1"
	local container_id
	local health_status

	container_id="$("${active_compose[@]}" ps -q "$service_name")"
	if [[ -z "$container_id" ]]; then
		return 1
	fi

	health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null)"

	if [[ "$health_status" == "healthy" ]]; then 
		return 0
	fi 
	return 1
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
	"${active_compose[@]}" ps >&2
	return 1
}

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

report_running_images(){
	local service_name
	local container_id
	local running_image 

	for service_name in backend frontend; do 
		if ! container_id="$("${active_compose[@]}" ps -q "$service_name" 2>/dev/null)"; then 
			echo "Running $service_name image: unavailable"
			continue
		fi
		if [[ -z "$container_id" ]]; then 
			echo "Running $service_name image: unavailable"
			continue
		fi
		if ! running_image="$(docker inspect --format '{{.Config.Image}}' "$container_id" 2>/dev/null)"; then
			echo "Running $service_name image: unavailable"
			continue
		fi

		echo "Running $service_name image: $running_image"
	done

}

write_release_marker(){
	local marker_file="$1"
	local marker_value="$2"
	local marker_name="${marker_file##*/}"

	if ! temporary_file="$(mktemp "$RELEASES_DIR/.${marker_name}.XXXXXX")"; then
		echo "Could not create temp $marker_name release marker" >&2
		temporary_file=''
		return 1
	fi
	if ! printf '%s\n' "$marker_value" > "$temporary_file"; then
		echo "Could not write temp $marker_name release marker" >&2
		rm -f "$temporary_file"
		temporary_file=''
		return 1
	fi
	if ! chmod 600 "$temporary_file"; then
		echo "Could not protect temp $marker_name release marker" >&2
		rm -f "$temporary_file"
		temporary_file=''
		return 1
	fi
	if ! chown root:root "$temporary_file"; then
		echo "Could not set owner for temp $marker_name release marker" >&2
		rm -f "$temporary_file"
		temporary_file=''
		return 1
	fi
	if ! mv -f "$temporary_file" "$marker_file"; then
		echo "Could not replace the $marker_name release marker" >&2
		rm -f "$temporary_file"
		temporary_file=''
		return 1
	fi

	temporary_file=''
	return 0
}

restore_previous_release_state(){
	phase='release-state-restoration'
	if [[ ! -f "$RECOVERY_ENV" ]]; then
		echo "Preserved release env is not available: $RECOVERY_ENV" >&2
		return 1
	fi
	if ! install -m 600 -o root -g root "$RECOVERY_ENV" "$RELEASE_ENV"; then
		echo "Previous successful release env could not be restored" >&2
		return 1
	fi
	if ! write_release_marker "$PREVIOUS_FILE" "$original_previous_sha"; then
		return 1
	fi
	if ! write_release_marker "$CURRENT_FILE" "$current_sha"; then
		return 1
	fi
	echo "previous successful release state restored"
	return 0
}

restore_previous_application(){
	phase="application-restoration"
	active_compose=("${compose_previous[@]}")
	record_history 'restoration-started'

	if ! "${active_compose[@]}" up -d --no-build --remove-orphans backend frontend; then 
		record_history "$RESTORATION_FAILED_EVENT"
		return 1
	fi 

	phase="restoration-health-checks"
	if ! wait_for_service_health backend; then 
		record_history "$RESTORATION_FAILED_EVENT"
		return 1
	fi

	if ! wait_for_service_health frontend; then 
		record_history "$RESTORATION_FAILED_EVENT"
		return 1
	fi

	if ! wait_for_http backend "$BACKEND_HEALTH_URL"; then
		record_history "$RESTORATION_FAILED_EVENT"
		return 1
	fi

	if ! wait_for_http frontend "$FRONTEND_HEALTH_URL"; then
		record_history "$RESTORATION_FAILED_EVENT"
		return 1
	fi

	record_history 'restoration-succeeded'
	echo "Previous application release restored successfully"
	echo "Restored SHA: $current_sha"
	report_running_images
	return 0
}

phase="application-recreation"
recovery_needed=true 
active_compose=("${compose_candidate[@]}")
"${compose_candidate[@]}" up -d --no-build --remove-orphans "${application_services[@]}"

phase="health-checks"
"${compose_candidate[@]}" ps
wait_for_service_health backend
wait_for_service_health frontend

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

phase="release-promotion"
promotion_started=true

mv -f "$CANDIDATE_ENV" "$RELEASE_ENV"
chmod 600 "$RELEASE_ENV"
chown root:root "$RELEASE_ENV"

write_release_marker "$PREVIOUS_FILE" "$previous_sha"
write_release_marker "$CURRENT_FILE" "$release_sha"

chmod 600 "$HISTORY_FILE"
chown root:root "$HISTORY_FILE"

if ! record_history 'candidate-promoted'; then
	echo "Canddiate deployment could not be written to deployment history" >&2
fi

candidate_started=false
recovery_needed=false
promotion_started=false
current_sha="$release_sha"

if [[ -f "$RECOVERY_ENV" ]]; then
	if ! rm -f "$RECOVERY_ENV"; then
		echo "Preserved relese env could not be removed" >&2
	fi
fi

phase="complete"
active_compose=("${compose_candidate[@]}")
report_running_images
echo "Deployment completed successfully"
echo "Deployment target: $deployment_target"
echo "Deployed SHA: $release_sha"
echo "Previous SHA: ${previous_sha:-none}"
