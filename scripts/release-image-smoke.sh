#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

image="${TASKFLOW_SMOKE_IMAGE:-taskflow:release-verification}"
token="taskflow-release-smoke-$(date +%s)-$$"
network="${token}-net"
database="${token}-db"
api="${token}-api"
test_secret="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
test_password="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"

inspect_owner() {
  local type="$1" name="$2"
  if ! docker "$type" inspect "$name" >/dev/null 2>&1; then
    return 1
  fi
  if [[ "$type" == "container" ]]; then
    docker inspect --format '{{ index .Config.Labels "taskflow.audit.run" }}' "$name"
  else
    docker network inspect --format '{{ index .Labels "taskflow.audit.run" }}' "$name"
  fi
}

remove_owned() {
  local type="$1" name="$2" owner
  owner="$(inspect_owner "$type" "$name")" || return 0
  if [[ "$owner" != "$token" ]]; then
    echo "Preserving resource without this test's ownership label: $name" >&2
    return 1
  fi
  if [[ "$type" == "container" ]]; then
    docker rm -f "$name" >/dev/null
  else
    docker network rm "$name" >/dev/null
  fi
}

cleanup() {
  local status=$?
  if (( status != 0 )); then
    echo "Smoke test failed; API container logs follow:" >&2
    docker logs "$api" 2>&1 >&2 || true
    echo "Database container logs follow:" >&2
    docker logs "$database" 2>&1 >&2 || true
  fi
  remove_owned container "$api" || true
  remove_owned container "$database" || true
  remove_owned network "$network" || true
  return "$status"
}
trap cleanup EXIT

for name in "$network" "$database" "$api"; do
  if docker inspect "$name" >/dev/null 2>&1 || docker network inspect "$name" >/dev/null 2>&1; then
    echo "Refusing to use a pre-existing smoke-test resource: $name" >&2
    exit 1
  fi
done
docker image inspect "$image" >/dev/null
docker network create --internal --label "taskflow.audit.run=$token" "$network" >/dev/null
echo "PASS: created uniquely named internal test network"

docker run -d --name "$database" --network "$network" \
  --label "taskflow.audit.run=$token" \
  --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev,size=256m \
  -e POSTGRES_DB=taskflow_test \
  -e POSTGRES_USER=validation \
  -e POSTGRES_PASSWORD=validation-only-db-password \
  postgres:16-alpine >/dev/null

database_ready=false
for _ in $(seq 1 30); do
  if docker exec "$database" pg_isready -U validation -d taskflow_test >/dev/null 2>&1; then
    database_ready=true
    break
  fi
  sleep 1
done
if [[ "$database_ready" != true ]]; then
  echo "FAIL: disposable PostgreSQL readiness timed out" >&2
  exit 1
fi
echo "PASS: disposable PostgreSQL is ready"

docker run -d --name "$api" --network "$network" \
  --label "taskflow.audit.run=$token" \
  -e APP_ENV=production \
  -e SECRET_KEY="$test_secret" \
  -e STUDY_APP_PASSWORD="$test_password" \
  -e DATABASE_URL="postgresql+psycopg://validation:validation-only-db-password@$database:5432/taskflow_test" \
  "$image" >/dev/null

api_ready=false
for _ in $(seq 1 30); do
  if docker exec "$api" python -c \
    'import urllib.request; urllib.request.urlopen("http://127.0.0.1:5000/api/health", timeout=2)' \
    >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 1
done
if [[ "$api_ready" != true ]]; then
  echo "FAIL: API startup or health check failed" >&2
  exit 1
fi
echo "PASS: API startup and health"

docker exec "$api" python -c \
  'import urllib.request; response=urllib.request.urlopen("http://127.0.0.1:5000/api/ready", timeout=3); assert response.status == 200; print("PASS: database readiness API")'

docker cp scripts/release_image_smoke.py "$api:/tmp/release_image_smoke.py" >/dev/null
docker exec -e "TASKFLOW_SMOKE_PASSWORD=$test_password" \
  "$api" python /tmp/release_image_smoke.py
