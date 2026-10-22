#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-local}"

case "$MODE" in
  local)
    ./scripts/pre-deploy-check.sh
    echo
    echo "Starting/updating the LOCAL development stack (database volumes are preserved)..."
    docker compose up -d --build
    docker compose ps
    echo
    echo "Local app: http://127.0.0.1:8080"
    echo "Sign in with STUDY_APP_PASSWORD from your local .env."
    ;;
  production)
    echo "This repository's production deployment is controlled by GitHub Actions."
    echo "Do not run docker compose down -v or manually replace the EC2 database."
    echo
    echo "Before production rollout:"
    echo "  1. Run ./scripts/pre-deploy-check.sh"
    echo "  2. Confirm EC2 /opt/taskflow/.env contains unique SECRET_KEY and STUDY_APP_PASSWORD."
    echo "  3. Update the production Compose API environment to pass both values."
    echo "  4. Confirm a PostgreSQL backup exists and test the image on a staging/local stack."
    echo "  5. Commit this feature branch, review the CI result, and merge via pull request."
    echo "  6. Let the configured GitHub Actions deployment workflow deploy the published image."
    if [[ "${CONFIRM_PRODUCTION_DEPLOY:-}" != "YES" ]]; then
      echo "Safety stop: this script does not deploy production automatically."
      echo "Set CONFIRM_PRODUCTION_DEPLOY=YES only after completing the checklist."
      exit 2
    fi
    echo "Confirmation received, but production deployment remains GitHub Actions-only."
    echo "Trigger the existing deploy workflow after merge; no EC2 action was taken."
    ;;
  *)
    echo "Usage: $0 [local|production]" >&2
    exit 2
    ;;
esac
