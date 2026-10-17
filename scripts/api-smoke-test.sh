#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${1:-http://localhost}"
echo "Checking health..."
curl --fail --silent --show-error "$BASE_URL/api/health"
echo
echo "Checking readiness..."
curl --fail --silent --show-error "$BASE_URL/api/ready"
echo
echo "Creating a test task..."
curl --fail --silent --show-error -X POST "$BASE_URL/api/tasks" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Smoke test","description":"Created by api-smoke-test.sh"}'
echo
