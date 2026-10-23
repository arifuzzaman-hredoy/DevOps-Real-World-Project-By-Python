# CST Study Matrix deployment checklist

The production application is a single Next.js/Node.js service backed by
PostgreSQL. Nginx proxies HTTP traffic to the Next.js server on port 3000.
Prometheus scrapes `/api/metrics` from the private Compose network.

## Required configuration

Set these values in the production environment file, outside Git:

- `APP_ENV=production`
- `SECRET_KEY`: stable private signing secret; changing it invalidates sessions.
- `STUDY_APP_PASSWORD`: private sign-in password.
- `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`.
- `GRAFANA_ADMIN_PASSWORD`.

The app must not use development defaults in production. Do not print or copy
secret values into logs, Git, or chat.

## Local release checks

1. Run `npm ci --prefix frontend`, `npm --prefix frontend run typecheck`, and
   `npm --prefix frontend run build`.
2. Run `docker compose config --quiet`.
3. Start a local stack and run
   `bash scripts/api-smoke-test.sh http://127.0.0.1:8080`.
4. Run `bash scripts/pre-ec2-full-stack-check.sh` to verify the app, database,
   reverse proxy, Prometheus, and Grafana together.
5. Verify login, dashboard-to-matrix/admin navigation, matrix interactions,
   data export/import, and reload behavior.

The complete study matrix, including its built-in subjects, chapters, and
design, remains available at `/legacy-matrix.html`. The built-in syllabus is
seeded into PostgreSQL when the matrix is first opened; progress, matrix
customizations, study settings, and study-tool data are saved there afterward.
Data from older browser local storage is intentionally not imported. If that
old data is needed, export it from the old version and restore it manually
after signing in. The dashboard reads the same saved syllabus, completion,
focus-session, and activity data.

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
