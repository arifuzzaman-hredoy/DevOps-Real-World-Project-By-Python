#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo
echo "=========================================="
echo " TaskFlow - Pre-EC2 API Validation"
echo "=========================================="
echo

fail() {
    echo
    echo "FAILED: $*" >&2
    echo "Check the logs using: docker compose logs --tail=100 api db" >&2
    exit 1
}

echo "[1/5] Validating Docker Compose configuration..."
docker compose config --quiet ||
    fail "Compose configuration validation failed."

echo "[2/5] Building the API image..."
docker compose build api ||
    fail "API image build failed."

echo "[3/5] Starting API and PostgreSQL..."
docker compose up -d db api ||
    fail "Could not start API and database."

echo "Waiting for API and database health checks..."

for attempt in $(seq 1 40); do
    API_ID="$(docker compose ps -q api)"
    DB_ID="$(docker compose ps -q db)"

    if [[ -n "$API_ID" && -n "$DB_ID" ]]; then
        API_HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$API_ID")"
        DB_HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$DB_ID")"

        if [[ "$API_HEALTH" == "healthy" && "$DB_HEALTH" == "healthy" ]]; then
            break
        fi

        if [[ "$API_HEALTH" == "unhealthy" || "$API_HEALTH" == "exited" ]]; then
            docker compose logs --tail=80 api
            fail "API did not become healthy."
        fi

        if [[ "$DB_HEALTH" == "unhealthy" || "$DB_HEALTH" == "exited" ]]; then
            docker compose logs --tail=80 db
            fail "Database did not become healthy."
        fi
    fi

    if [[ "$attempt" -eq 40 ]]; then
        docker compose ps
        docker compose logs --tail=80 api db
        fail "Timed out waiting for containers to become healthy."
    fi

    sleep 2
done

echo "API and database are healthy."

echo
echo "[4/5] Running automated API and database integration tests..."

docker compose exec -T api python - <<'PY'
import json
import uuid
import urllib.error
import urllib.request

from app.main import app
from app.extensions import db
from app.models import Task

BASE_URL = "http://127.0.0.1:5000"
title = f"Automated integration test {uuid.uuid4()}"
task_id = None
checks = 0


def request(method, path, payload=None, expected_status=200):
    global checks

    data = None
    headers = {}

    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        BASE_URL + path,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            body = response.read()
    except urllib.error.HTTPError as error:
        status = error.code
        body = error.read()

    if status != expected_status:
        raise AssertionError(
            f"{method} {path}: expected HTTP {expected_status}, got {status}. "
            f"Response: {body.decode(errors='replace')}"
        )

    checks += 1
    print(f"PASS {method:6} {path:25} HTTP {status}")

    if not body:
        return None

    return json.loads(body)


try:
    # 1. Application health
    request("GET", "/api/health")

    # 2. Database readiness
    request("GET", "/api/ready")

    # 3. Create a task
    created = request(
        "POST",
        "/api/tasks",
        {
            "title": title,
            "description": "Automated pre-EC2 integration test",
        },
        expected_status=201,
    )

    task_id = created["id"]

    assert created["title"] == title
    assert created["status"] == "todo"

    # 4. Confirm that PostgreSQL actually persisted the task
    with app.app_context():
        db_task = db.session.get(Task, task_id)
        assert db_task is not None, "Task was not found in the database."
        assert db_task.title == title

    checks += 1
    print("PASS DATABASE task persisted in PostgreSQL")

    # 5. List tasks
    tasks = request("GET", "/api/tasks")
    assert any(task["id"] == task_id for task in tasks)

    # 6. Retrieve the individual task
    fetched = request("GET", f"/api/tasks/{task_id}")
    assert fetched["title"] == title

    # 7. Update the task
    updated = request(
        "PATCH",
        f"/api/tasks/{task_id}",
        {"status": "in_progress", "description": "Updated by automated test"},
    )
    assert updated["status"] == "in_progress"

    # 8. Verify invalid status is rejected
    request(
        "PATCH",
        f"/api/tasks/{task_id}",
        {"status": "invalid_status"},
        expected_status=400,
    )

    # 9. Delete the test task
    request("DELETE", f"/api/tasks/{task_id}", expected_status=204)
    task_id = None

    # 10. Verify it no longer exists
    request("GET", f"/api/tasks/{created['id']}", expected_status=404)

    print()
    print(f"SUCCESS: All {checks} integration checks passed.")
    print("The temporary test task was deleted.")
    print("Existing database records were not intentionally modified.")

except Exception:
    # Remove the temporary test task if a later check fails.
    if task_id is not None:
        try:
            request("DELETE", f"/api/tasks/{task_id}", expected_status=204)
        except Exception:
            print(
                f"WARNING: Could not clean up test task ID {task_id}.",
                flush=True,
            )
    raise
PY

echo
echo "[5/5] Final container status..."
docker compose ps

echo
echo "=========================================="
echo " PRE-EC2 API VALIDATION COMPLETED"
echo "=========================================="
