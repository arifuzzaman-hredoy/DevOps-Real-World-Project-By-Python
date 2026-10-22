#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(pwd)"
COMPOSE_FILE="compose.yaml"

# Expected local service endpoints
NGINX_URL="http://127.0.0.1:8080"
PROMETHEUS_URL="http://127.0.0.1:9091"
GRAFANA_URL="http://127.0.0.1:3001"

section() {
    printf '\n==========================================\n'
    printf ' %s\n' "$1"
    printf '==========================================\n'
}

fail() {
    echo
    echo "ERROR: $1"
    echo
    echo "Container status:"
    docker compose ps || true

    echo
    echo "Recent logs:"
    docker compose logs --tail=60 api db nginx prometheus grafana 2>/dev/null || true

    exit 1
}

trap 'fail "Unexpected error at line $LINENO."' ERR

if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Run this script from the project root directory."
    exit 1
fi

section "CST Study Matrix - Full-Stack Pre-EC2 Validation"

echo "[1/7] Validating Docker Compose configuration..."
docker compose config --quiet
echo "PASS: Compose configuration is valid."

echo
echo "[2/7] Building the API image..."
docker compose build api
echo "PASS: API image build completed."

echo
echo "[3/7] Starting the full application stack..."
docker compose up -d

echo
echo "Waiting for API and database health checks..."

healthy=false

for attempt in $(seq 1 60); do
    api_id="$(docker compose ps -q api)"
    db_id="$(docker compose ps -q db)"

    if [[ -n "$api_id" && -n "$db_id" ]]; then
        api_health="$(docker inspect \
            --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
            "$api_id" 2>/dev/null || true)"

        db_health="$(docker inspect \
            --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
            "$db_id" 2>/dev/null || true)"

        if [[ "$api_health" == "healthy" && "$db_health" == "healthy" ]]; then
            healthy=true
            break
        fi

        if [[ "$api_health" == "unhealthy" || "$db_health" == "unhealthy" ]]; then
            fail "API or PostgreSQL reported an unhealthy status."
        fi
    fi

    sleep 2
done

if [[ "$healthy" != true ]]; then
    fail "API and PostgreSQL did not become healthy within 120 seconds."
fi

echo "PASS: API and PostgreSQL are healthy."

echo
echo "[4/7] Checking HTTP endpoints..."

export NGINX_URL PROMETHEUS_URL GRAFANA_URL

python3 - <<'PY'
import json
import os
import sys
import time
import urllib.error
import urllib.request

checks = [
    ("Nginx -> API health", os.environ["NGINX_URL"] + "/api/health"),
    ("Nginx -> API readiness", os.environ["NGINX_URL"] + "/api/ready"),
    ("Prometheus readiness", os.environ["PROMETHEUS_URL"] + "/-/ready"),
    ("Grafana health", os.environ["GRAFANA_URL"] + "/api/health"),
]

def get(url, timeout=3):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "TaskFlow-Pre-EC2-Check/1.0"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8", errors="replace")
        return response.status, body

for label, url in checks:
    last_error = None

    for attempt in range(30):
        try:
            status, body = get(url)

            if status == 200:
                print(f"PASS: {label} (HTTP {status})")
                break

            last_error = f"HTTP {status}"

        except Exception as exc:
            last_error = str(exc)

        time.sleep(2)
    else:
        print(f"FAIL: {label}: {last_error}", file=sys.stderr)
        sys.exit(1)

    if label == "Nginx -> API health":
        try:
            payload = json.loads(body)
            if payload.get("status") != "ok":
                print(f"FAIL: Unexpected API health response: {body}", file=sys.stderr)
                sys.exit(1)
        except json.JSONDecodeError:
            print("FAIL: API health endpoint did not return JSON.", file=sys.stderr)
            sys.exit(1)

    if label == "Nginx -> API readiness":
        try:
            payload = json.loads(body)
            if payload.get("status") != "ready" or payload.get("database") != "ok":
                print(f"FAIL: API is not ready: {body}", file=sys.stderr)
                sys.exit(1)
        except json.JSONDecodeError:
            print("FAIL: API readiness endpoint did not return JSON.", file=sys.stderr)
            sys.exit(1)
PY

echo
echo "[5/7] Checking Prometheus monitoring targets..."

python3 - <<'PY'
import json
import os
import sys
import time
import urllib.request

url = os.environ["PROMETHEUS_URL"] + "/api/v1/targets?state=active"

for attempt in range(30):
    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "TaskFlow-Pre-EC2-Check/1.0"},
        )

        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))

        if payload.get("status") != "success":
            raise RuntimeError("Prometheus returned an unsuccessful API response.")

        targets = payload.get("data", {}).get("activeTargets", [])

        if targets and all(target.get("health") == "up" for target in targets):
            print(f"PASS: All {len(targets)} active Prometheus target(s) are UP.")

            for target in targets:
                print(
                    "  - "
                    + target.get("labels", {}).get("job", "unknown-job")
                    + ": "
                    + target.get("scrapeUrl", "unknown-target")
                )

            break

        if targets:
            print("Waiting for Prometheus targets:")
            for target in targets:
                print(
                    "  - "
                    + target.get("scrapeUrl", "unknown-target")
                    + " => "
                    + target.get("health", "unknown")
                )

    except Exception as exc:
        print(f"Waiting for Prometheus target information: {exc}")

    time.sleep(2)
else:
    print(
        "FAIL: Prometheus has no active targets or one or more targets are DOWN.",
        file=sys.stderr,
    )
    sys.exit(1)
PY

echo
echo "[6/7] Checking all Compose services..."

docker compose ps

echo
echo "[7/7] Final validation..."

echo "PASS: Compose configuration"
echo "PASS: API and PostgreSQL health"
echo "PASS: Nginx reverse proxy"
echo "PASS: Prometheus readiness and target health"
echo "PASS: Grafana health"

section "FULL-STACK VALIDATION SUCCESSFUL"

echo "TaskFlow is running locally."
echo "Nginx:      $NGINX_URL"
echo "Prometheus: $PROMETHEUS_URL"
echo "Grafana:    $GRAFANA_URL"
echo
echo "No Docker volumes were intentionally deleted."
