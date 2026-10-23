# CST Study Matrix deployment checklist

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
