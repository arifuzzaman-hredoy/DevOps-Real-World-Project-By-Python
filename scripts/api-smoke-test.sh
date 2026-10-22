#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${1:-http://127.0.0.1:8080}"
echo "Checking public health endpoint..."
curl --fail --silent --show-error "$BASE_URL/api/health"
echo
echo "Checking database readiness..."
curl --fail --silent --show-error "$BASE_URL/api/ready"
echo
echo "Checking login page..."
curl --fail --silent --show-error "$BASE_URL/login" | grep -q "CST Semester Study Matrix"
echo "PASS: login page is reachable."
echo "Checking that study data is protected before login..."
status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL/api/study/state")"
if [[ "$status" != "401" ]]; then
  echo "FAIL: expected unauthenticated study API to return 401, got $status" >&2
  exit 1
fi
echo "PASS: unauthenticated study API returns HTTP 401."
