#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() {
    echo "FAILED: $*" >&2
    docker compose -f devops/compose.yaml ps >&2 || true
    docker compose -f devops/compose.yaml logs --tail=60 frontend backend db nginx prometheus grafana >&2 || true
    exit 1
}

echo "[1/5] Validating and starting the full Compose stack..."
docker compose -f devops/compose.yaml config --quiet || fail "Compose configuration is invalid."
docker compose -f devops/compose.yaml up --build -d || fail "Could not start Compose services."

echo "[2/5] Waiting for the API and PostgreSQL..."
for attempt in $(seq 1 60); do
    if curl --fail --silent --show-error http://127.0.0.1:8080/api/ready >/dev/null; then
        break
    fi
    if [[ "$attempt" -eq 60 ]]; then
        fail "The API did not become ready."
    fi
    sleep 2
done

echo "[3/5] Testing task, login, and session endpoints..."
bash devops/scripts/api-smoke-test.sh http://127.0.0.1:8080

echo "[4/5] Checking Prometheus and Grafana..."
curl --fail --silent --show-error --retry 20 --retry-delay 2 \
    http://127.0.0.1:9091/-/ready >/dev/null || fail "Prometheus is not ready."
curl --fail --silent --show-error --retry 20 --retry-delay 2 \
    http://127.0.0.1:3001/api/health >/dev/null || fail "Grafana is not ready."
curl --fail --silent --show-error \
    'http://127.0.0.1:9091/api/v1/targets?state=active' |
    node -e '
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const result = JSON.parse(input);
        const targets = result.data?.activeTargets ?? [];
        if (result.status !== "success" || targets.length === 0 || targets.some(target => target.health !== "up")) {
          console.error("Prometheus has no healthy active targets.");
          process.exit(1);
        }
        console.log(`PASS: ${targets.length} Prometheus target(s) are up.`);
      });
    ' || fail "Prometheus targets are unhealthy."

echo "[5/5] Final service status..."
docker compose -f devops/compose.yaml ps
echo "PASS: Full Node.js/PostgreSQL/monitoring stack checks completed."
