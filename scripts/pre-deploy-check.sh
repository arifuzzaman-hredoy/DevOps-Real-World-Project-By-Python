#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

echo "== Pre-deployment safety checks =="

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is unavailable."

echo "[1/5] Validate Compose syntax"
docker compose config --quiet || fail "Compose configuration is invalid."

echo "[2/5] Check production configuration placeholders"
if [[ -f .env ]]; then
  if grep -Eq '^(SECRET_KEY|STUDY_APP_PASSWORD)=(replace-with|dev-only-change-me|local-dev-change-this)' .env; then
    fail ".env contains a known placeholder secret. Set unique values first."
  fi
  if grep -Eq '^POSTGRES_PASSWORD=change-this-local-password$' .env; then
    fail ".env still uses the example PostgreSQL password."
  fi
else
  echo "WARNING: .env is absent. Compose defaults are for local development only."
fi

echo "[3/5] Run automated tests"
./scripts/test.sh || fail "Automated tests failed."

echo "[4/5] Check for accidental secret/state files in Git status"
for secret_path in .env terraform/terraform.tfvars terraform/terraform.tfstate; do
  if git ls-files --error-unmatch "$secret_path" >/dev/null 2>&1; then
    fail "A local secret/state file is tracked by Git: $secret_path. Remove it from tracking safely before deployment."
  fi
done

echo "[5/5] Build the application image"
docker compose build api || fail "Docker image build failed."

echo "PASS: pre-deployment checks completed. No production deployment was performed."
