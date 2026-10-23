#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${1:-http://127.0.0.1:8080}"
COMPOSE_PROJECT="${2:-}"
PASSWORD="${STUDY_APP_PASSWORD:-}"
if [[ -z "$PASSWORD" ]]; then
    if [[ -n "$COMPOSE_PROJECT" ]]; then
        PASSWORD="$(docker compose -p "$COMPOSE_PROJECT" exec -T api node -p 'process.env.STUDY_APP_PASSWORD' 2>/dev/null || true)"
    else
        PASSWORD="$(docker compose exec -T api node -p 'process.env.STUDY_APP_PASSWORD' 2>/dev/null || true)"
    fi
fi
PASSWORD="${PASSWORD:-study-matrix-local}"
TMP_DIR="$(mktemp -d)"
TASK_ID=""

cleanup() {
    if [[ -n "$TASK_ID" ]]; then
        curl --silent --output /dev/null --request DELETE "$BASE_URL/api/tasks/$TASK_ID" || true
    fi
    rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

request() {
    local expected="$1"
    local output="$2"
    shift 2
    local actual
    actual="$(curl --silent --show-error --output "$output" --write-out '%{http_code}' "$@")"
    if [[ "$actual" != "$expected" ]]; then
        printf 'FAIL: expected HTTP %s, got %s: %s\n' "$expected" "$actual" "$(cat "$output")" >&2
        exit 1
    fi
}

echo "Checking Node.js health and PostgreSQL readiness..."
request 200 "$TMP_DIR/health" "$BASE_URL/api/health"
grep -q '"status":"ok"' "$TMP_DIR/health"
request 200 "$TMP_DIR/ready" "$BASE_URL/api/ready"
grep -q '"database":"ok"' "$TMP_DIR/ready"

echo "Checking task create, read, update, validation, and delete..."
request 201 "$TMP_DIR/task" \
    --header 'Content-Type: application/json' \
    --data '{"title":"API smoke test","description":"Temporary CI task"}' \
    "$BASE_URL/api/tasks"
TASK_ID="$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).id))' "$TMP_DIR/task")"
[[ "$TASK_ID" =~ ^[1-9][0-9]*$ ]]

request 200 "$TMP_DIR/list" "$BASE_URL/api/tasks"
grep -q "\"id\":$TASK_ID" "$TMP_DIR/list"
request 200 "$TMP_DIR/get" "$BASE_URL/api/tasks/$TASK_ID"
grep -q '"title":"API smoke test"' "$TMP_DIR/get"
request 200 "$TMP_DIR/update" \
    --request PATCH \
    --header 'Content-Type: application/json' \
    --data '{"status":"in_progress","title":"Updated smoke test"}' \
    "$BASE_URL/api/tasks/$TASK_ID"
grep -q '"status":"in_progress"' "$TMP_DIR/update"
request 400 "$TMP_DIR/invalid" \
    --request PATCH \
    --header 'Content-Type: application/json' \
    --data '{"status":"invalid"}' \
    "$BASE_URL/api/tasks/$TASK_ID"
request 204 "$TMP_DIR/delete" --request DELETE "$BASE_URL/api/tasks/$TASK_ID"
TASK_ID=""
request 404 "$TMP_DIR/missing" "$BASE_URL/api/tasks/999999999"

echo "Checking login, session, CSRF, and logout..."
request 401 "$TMP_DIR/unauthenticated" "$BASE_URL/api/auth/me"
request 401 "$TMP_DIR/protected" "$BASE_URL/api/study/state"
request 200 "$TMP_DIR/csrf" --cookie-jar "$TMP_DIR/cookies" "$BASE_URL/api/auth/csrf"
CSRF="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).csrf_token)' "$TMP_DIR/csrf")"
request 200 "$TMP_DIR/login" \
    --cookie "$TMP_DIR/cookies" --cookie-jar "$TMP_DIR/cookies" \
    --header "X-CSRF-Token: $CSRF" \
    --header 'Content-Type: application/json' \
    --data "$(node -e 'process.stdout.write(JSON.stringify({password: process.argv[1]}))' "$PASSWORD")" \
    "$BASE_URL/api/auth/login"
request 200 "$TMP_DIR/authenticated" --cookie "$TMP_DIR/cookies" "$BASE_URL/api/auth/me"
request 200 "$TMP_DIR/state" --cookie "$TMP_DIR/cookies" "$BASE_URL/api/study/state"
request 200 "$TMP_DIR/logout-csrf" \
    --cookie "$TMP_DIR/cookies" --cookie-jar "$TMP_DIR/cookies" \
    "$BASE_URL/api/csrf"
CSRF="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).csrf_token)' "$TMP_DIR/logout-csrf")"
request 204 "$TMP_DIR/logout" \
    --cookie "$TMP_DIR/cookies" --cookie-jar "$TMP_DIR/cookies" \
    --header "X-CSRF-Token: $CSRF" \
    --request POST "$BASE_URL/api/auth/logout"
request 401 "$TMP_DIR/signed-out" --cookie "$TMP_DIR/cookies" "$BASE_URL/api/auth/me"

echo "Checking Prometheus metrics..."
for path in \
    /api/metrics \
    '/api/metrics?format=prometheus' \
    /api/metrics/ \
    /api/metrics/extra \
    /api//metrics \
    //api/metrics \
    /api/./metrics \
    /api/other/../metrics \
    /%61pi/metrics \
    /api/%6Detrics \
    /api%2fmetrics
do
    request 404 "$TMP_DIR/metrics" --path-as-is "$BASE_URL$path"
done
if [[ -n "$COMPOSE_PROJECT" ]]; then
    docker compose -p "$COMPOSE_PROJECT" exec -T api node -e '
fetch("http://127.0.0.1:3000/api/metrics")
  .then(async response => {
    const body = await response.text();
    if (response.status !== 200 || !body.includes("taskflow_http_requests_total") ||
        !body.includes("taskflow_http_request_duration_seconds_bucket")) process.exit(1);
  })
  .catch(() => process.exit(1));
'
else
    docker compose exec -T api node -e '
fetch("http://127.0.0.1:3000/api/metrics")
  .then(async response => {
    const body = await response.text();
    if (response.status !== 200 || !body.includes("taskflow_http_requests_total") ||
        !body.includes("taskflow_http_request_duration_seconds_bucket")) process.exit(1);
  })
  .catch(() => process.exit(1));
'
fi

echo "PASS: Node.js API smoke checks completed."
