# CST Study Matrix deployment checklist

<<<<<<< HEAD
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
  =======
  The application has a Next.js frontend and a separate Node.js API service,
  backed by PostgreSQL. Nginx routes UI traffic to frontend port 3000 and API
  traffic to backend port 3001. Prometheus scrapes `/api/metrics` privately.

## Required configuration

Set these values in the production environment file, outside Git:

- `APP_ENV=production`
- `SECRET_KEY`: stable private signing secret; changing it invalidates sessions.
- `STUDY_APP_PASSWORD`: private sign-in password of at least 6 characters. Use a
  longer, unique password because this app uses a shared single-password login.
- `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`.
- `GRAFANA_ADMIN_PASSWORD`.

The app must not use development defaults in production. Do not print or copy
secret values into logs, Git, or chat.

## Local release checks

1. Install, typecheck, and build both apps:
   `npm ci --prefix frontend`, `npm ci --prefix backend`,
   `npm --prefix frontend run typecheck`,
   `npm --prefix backend run typecheck`,
   `npm --prefix frontend run build`, and `npm --prefix backend run build`.
2. Run `docker compose -f devops/compose.yaml config --quiet`.
3. Start a local stack and run
   `docker compose -f devops/compose.yaml up --build -d`, then
   `bash devops/scripts/api-smoke-test.sh http://127.0.0.1:8080`.
4. Run `bash devops/scripts/pre-ec2-full-stack-check.sh` to verify the app, database,
   reverse proxy, Prometheus, and Grafana together.
5. Verify login, the default matrix, matrix interactions, data export/import,
   and reload behavior.

The converted study matrix opens after login. Its built-in subjects and
chapters are seeded into PostgreSQL when first opened; progress, matrix
customizations, study settings, and study-tool data are saved there afterward.
Data from older browser local storage is intentionally not imported.

## Database compatibility

The Node API retains the existing PostgreSQL `task` table and adds the
`study_states` table on demand. This is an additive schema change; do not drop
or recreate the PostgreSQL volume during an application upgrade. Confirm an
off-host backup and a tested restore before production changes.

## Production rollout

- Deploy only a reviewed image identified by its immutable commit-SHA tag.
- Validate Compose interpolation and check the installed deployment helper
  before running it; do not assume a repository candidate matches the helper
  already installed on the host.
- Preserve existing volumes and secrets. Do not run `docker compose down -v`.
- After rollout, verify `/login`, `/api/health`, `/api/ready`, authenticated
  study-state access, and the Prometheus target.
- If health checks fail, use the approved previous-image rollback procedure;
  application rollback does not undo database changes or writes.
  > > > > > > > integration/nextjs-main
