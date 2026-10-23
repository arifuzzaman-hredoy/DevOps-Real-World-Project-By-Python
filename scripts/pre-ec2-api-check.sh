#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
    echo "FAILED: $*" >&2
    docker compose logs --tail=80 api db >&2 || true
    exit 1
}

echo "[1/4] Validating Compose configuration..."
docker compose config --quiet || fail "Compose configuration is invalid."

echo "[2/4] Building and starting Next.js API with PostgreSQL and Nginx..."
docker compose up --build -d api db nginx || fail "Could not start the API stack."

echo "[3/4] Waiting for the API and database..."
for attempt in $(seq 1 40); do
    if curl --fail --silent --show-error http://127.0.0.1:8080/api/ready >/dev/null; then
        break
    fi
    if [[ "$attempt" -eq 40 ]]; then
        fail "The API did not become ready."
    fi
    sleep 2
done

echo "[4/4] Running Node.js API integration checks..."
bash scripts/api-smoke-test.sh http://127.0.0.1:8080
docker compose ps
echo "PASS: Next.js API and PostgreSQL checks completed."
