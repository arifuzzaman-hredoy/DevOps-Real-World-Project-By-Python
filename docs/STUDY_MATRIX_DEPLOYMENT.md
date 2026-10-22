# CST Study Matrix deployment checklist

The React/TypeScript dashboard is the primary application. The production API
image includes its frontend build. `/legacy` remains available for features
that have not been ported and verified in React. Study-state endpoints require
authentication, and writes require CSRF protection. Do not roll out until the
production configuration, database recovery, and rollback path are verified.

## Production configuration contract

The Flask production runtime requires:

- `APP_ENV=production`.
- `SECRET_KEY`: a stable private value at least 32 characters long. Replacing
  it invalidates existing signed sessions; do not rotate it blindly.
- `STUDY_APP_PASSWORD`: a private password at least 16 characters long.
- `DATABASE_URL`: a PostgreSQL URL assembled by production Compose.
- `FRONTEND_DIST_DIR`: set by the release image to its built frontend directory.

Production Compose also requires `POSTGRES_DB`, `POSTGRES_USER`, and
`POSTGRES_PASSWORD` in `/opt/taskflow/.env`. The image is selected through
`TASKFLOW_API_IMAGE` using the immutable `sha-<40-character SHA>` tag. The API
fails at startup if these production requirements, authentication, PostgreSQL,
or the built frontend are missing. It does not fall back to SQLite or a
development signing key.

## Configuration migration (requires a separate approved change window)

This local preparation does not modify the server.

1. Confirm the existing stable `SECRET_KEY` and intended app password are
   available through the approved secret manager. Check only variable names in
   terminal output; never print or copy values into Git or chat. If a secret is
   genuinely absent, stop and obtain owner approval to establish it using the
   approved secret-management process.
2. Back up `/opt/taskflow/.env` and `/opt/taskflow/compose.yaml` outside Git
   with restrictive permissions. Do not copy either file to the workstation.
3. Preserve the existing database settings and credentials. Add only missing
   application variables from the approved secret source; do not regenerate
   PostgreSQL credentials or overwrite existing secrets.
4. Apply the reviewed production Compose API environment and immutable image
   reference. Keep existing volumes, networks, and health checks.
5. Apply the reviewed Nginx metrics-deny rules, validate them, and confirm that
   the public metrics URL returns 404 before deploying the new API.
6. Validate production Compose interpolation without recreating services:

   ```bash
   cd /opt/taskflow
   sudo docker compose --env-file .env -f compose.yaml config --quiet
   ```

7. Complete the production backup and isolated restore test in
   [RUNBOOK_BACKUP_RESTORE.md](./RUNBOOK_BACKUP_RESTORE.md). A written
   procedure alone does not prove a backup exists.

## Before release authorization

1. Preserve all local browser Study Matrix data. React never uploads browser
   data automatically. Use the explicit recovery flow only when the account
   has no server-side plan; existing server data is never overwritten.
2. Run `bash scripts/test.sh`, frontend typecheck/lint/tests/build, Compose
   validation, and the image build/scan checks.
3. Verify React login, the Study Matrix, chapter and question progress,
   filtering/navigation, JSON backup export/import, and reload persistence in a
   local stack.
4. Verify `/legacy` for focus timer, admin, achievements, and print features.
   Do not remove the legacy UI until React feature parity is demonstrated.
5. Complete an approved production PostgreSQL backup and isolated restore test.
6. Confirm that CI passes and verify the digest associated with the exact
   commit-SHA image in GHCR. Do not use the mutable `latest` alias for release.

## First rollout and deployment checks

- Merge only through the reviewed repository process after CI passes.
- Deployment is manual. Dispatch the production workflow with the exact
  `sha-<40-character commit SHA>` image tag after explicit release approval.
- The workflow checks required production setting names and strength without
  printing secret values, validates the active Nginx configuration, and stops
  unless the public metrics endpoint returns 404.
- The deployment helper updates the API service only. It records the current
  image ID/digest, pulls the selected image, waits for local and public
  readiness, and attempts API-image rollback if health fails. It does not
  change Nginx or restore database contents.
- After rollout, verify:
  - `/login`, `/api/health`, and `/api/ready` return expected responses.
  - Unauthenticated `/api/study/state` returns 401; authenticated access works.
  - Login CSRF retrieval and login work; writes without valid CSRF return 403.
  - A study-state save and reload succeeds without replacing existing state.
  - Public `/api/metrics` returns 404 while Prometheus scrapes `api:5000`
    directly on the private Compose network.
  - Prometheus targets and Grafana dashboards remain healthy.

## Rollback and data safety

- Do not run `docker compose down -v`.
- Do not delete or recreate the `taskflow-db-data` volume.
- Do not remove the legacy `task` table during the first rollout.
- SQLAlchemy creates the new `study_states` table at app startup; there is no
  versioned migration history. This initial schema addition is additive, but
  the application image rollback does not undo database changes or writes.
- If the API image fails health checks, use the helper's previous-image
  rollback and preserve the database volume. If data integrity is in question,
  follow the recovery decision process in the backup runbook; do not perform an
  in-place restore as an application rollback.
