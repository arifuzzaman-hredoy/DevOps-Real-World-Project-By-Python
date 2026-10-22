#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== CST Study Matrix: pre-EC2 API validation =="

docker compose config --quiet
docker compose build api
docker compose up -d db api nginx

echo "Waiting for API and PostgreSQL health..."
for attempt in $(seq 1 40); do
  api_id="$(docker compose ps -q api)"
  db_id="$(docker compose ps -q db)"
  if [[ -n "$api_id" && -n "$db_id" ]]; then
    api_health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$api_id")"
    db_health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$db_id")"
    if [[ "$api_health" == "healthy" && "$db_health" == "healthy" ]]; then
      break
    fi
    if [[ "$api_health" == "unhealthy" || "$api_health" == "exited" || "$db_health" == "unhealthy" || "$db_health" == "exited" ]]; then
      docker compose logs --tail=80 api db
      echo "FAIL: service became unhealthy." >&2
      exit 1
    fi
  fi
  if [[ "$attempt" -eq 40 ]]; then
    docker compose ps
    docker compose logs --tail=80 api db
    echo "FAIL: timed out waiting for health checks." >&2
    exit 1
  fi
  sleep 2
done

echo "Checking public API endpoints..."
curl --fail --silent --show-error http://127.0.0.1:8080/api/health
echo
curl --fail --silent --show-error http://127.0.0.1:8080/api/ready
echo
echo "Checking login page and API access control..."
curl --fail --silent --show-error http://127.0.0.1:8080/login | grep -q "CST Semester Study Matrix"
status="$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:8080/api/study/state)"
[[ "$status" == "401" ]] || { echo "FAIL: expected 401, got $status" >&2; exit 1; }

echo "PASS: API and database are healthy; login and access control checks passed."
docker compose ps
