<<<<<<< HEAD
# TaskFlow — Academic Study Workspace

TaskFlow is an academic Study Matrix and progress dashboard backed by a Flask API
and PostgreSQL. The React/TypeScript dashboard is the primary experience. The
older Jinja page remains available at `/legacy` while its additional features are
being ported.

## Architecture

```text
Browser
  React/TypeScript academic dashboard and Study Matrix
       |
       | same-origin HTTPS/HTTP requests + session cookie
       v
Nginx reverse proxy
       |
       +--> Flask + Gunicorn API and built React assets
       |      - Login/session and CSRF protection
       |      - Study-state REST API
       |      - Health/readiness and Prometheus metrics
       |
       +--> PostgreSQL
  - study_states JSON documents
  - persistent Docker volume
```

The API image builds and contains the React production assets. In production the
TLS Nginx proxy forwards application requests to Flask; the local development
Nginx image serves the same frontend assets directly. The authenticated `/legacy`
route preserves the existing Jinja experience, including features not yet
available in React such as the study hub, focus timer, admin editing, and
export/print.

Study data is persisted as validated JSON documents, not a normalized
per-subject/per-chapter schema. React never uploads browser-local data
automatically: when no server plan exists, the user can explicitly restore a
valid browser copy or supported JSON backup. Existing server data is preserved.

## Security

- The app requires a login session before displaying the study UI or exposing study-state endpoints.
- Mutating study-state API requests require a session CSRF token.
- Production startup fails closed unless `SECRET_KEY`, `STUDY_APP_PASSWORD`,
  PostgreSQL `DATABASE_URL`, and the built frontend are valid. Configure these
  through the approved secret process before deployment.
- Session cookies are HttpOnly and SameSite=Lax; Secure is enabled when `APP_ENV=production`.
- Health and readiness remain publicly available for monitoring. The production
  and local Nginx configurations deny public `/api/metrics` requests; Prometheus
  scrapes the API directly over the private Docker network.
- The local Compose Nginx port is bound to `127.0.0.1:8080`; it is intended for local development only.
- Never commit `.env`, Terraform variable files, plans, state, passwords, tokens, or private keys.

## Local quick start

Requirements: Docker Engine, Docker Compose plugin, Python 3.12+ for tests.

```bash
cp .env.example .env
```

Edit `.env` and replace the placeholder values. Keep `POSTGRES_PASSWORD` as a local-only value unless you also understand the URL/credential setup. The Compose file constructs the database URL from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
curl http://127.0.0.1:8080/api/health
curl http://127.0.0.1:8080/api/ready
```

Open `http://127.0.0.1:8080` and sign in with the value in `.env` named `STUDY_APP_PASSWORD`.

To stop the stack without deleting database data:
=======
# CST Semester Study Matrix

A full-stack study-progress application built with Next.js, React, TypeScript,
Node.js route handlers, and PostgreSQL. The original interactive study matrix
and its built-in subjects and chapters are preserved at `/legacy-matrix.html`.
The syllabus is seeded into PostgreSQL, and new progress and study-tool data
are stored there; progress from the old browser-local version is not imported.
The Next.js dashboard, login, matrix workspace, and admin panel are the primary
entry points.

## Local run

Requirements: Docker Engine and the Docker Compose plugin.

1. Copy `.env.example` to `.env`.
2. Set a private `SECRET_KEY`, `STUDY_APP_PASSWORD`, and PostgreSQL password.
3. Start the stack:

   ```bash
   docker compose up --build -d
   docker compose ps
   ```

4. Open `http://localhost:8080/login` and sign in with `STUDY_APP_PASSWORD`.

The app is served by Next.js on the private Compose network. Nginx exposes the
site at port 8080, and PostgreSQL is not published to the host. Prometheus and
Grafana are available on ports 9091 and 3001 respectively.

To stop the stack without deleting data:
>>>>>>> integration/nextjs-main

```bash
docker compose down
```

<<<<<<< HEAD
**Do not use `docker compose down -v` unless you intentionally want to delete the local database volume.**

The dashboard's Settings section downloads a JSON backup of the saved plan and
progress. The explicit recovery flow never uploads browser-local data when a
server plan already exists. The authenticated `/legacy` route remains available
from Settings for focus timer, admin, achievements, and print/export workflows
not yet ported to React.

## Tests and deployment checks

Run the full local test script. It creates `.venv` if necessary and installs the pinned development requirements when missing:

```bash
./scripts/test.sh
```

Validate configuration, tests, and image build before deploying:

```bash
./scripts/pre-deploy-check.sh
```

Start/update the local stack only after the checks pass:

```bash
./scripts/deploy.sh local
```

The `production` mode of `scripts/deploy.sh` is deliberately a safety gate.
The publish workflow builds and scans the API image; deployment is a separate
manual GitHub Actions dispatch that accepts only an immutable
`sha-<40-character commit SHA>` tag. The production Compose API service requires
`SECRET_KEY` and `STUDY_APP_PASSWORD` from `/opt/taskflow/.env`. Do not deploy
until the current production configuration, immutable target image, database
backup, and rollback path have been verified. The deployment helper updates the
API service only; production Nginx configuration is server-managed and requires
a separately reviewed, backed-up change.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Public liveness check |
| GET | `/api/ready` | Public database readiness check |
| GET | `/api/auth/csrf` | Create an anonymous login CSRF token |
| POST | `/api/auth/login` | Sign in with password and login CSRF token |
| POST | `/api/auth/logout` | Sign out (login + CSRF required) |
| GET | `/api/csrf` | Authenticated mutation CSRF token |
| GET | `/api/study/state` | Read persisted study documents (login required) |
| PUT | `/api/study/state/<key>` | Save one allowed study document (login + CSRF required) |
| DELETE | `/api/study/state/<key>` | Delete one allowed study document (login + CSRF required) |
| GET | `/api/metrics` | Internal Prometheus metrics |

Allowed study keys are `cst-study-data-v2`, `cst-study-matrix-v1`, `cst-hub-v1`, and `cst-fx-v1`. Requests are size-limited and arbitrary keys are rejected.

Legacy `/api/tasks` endpoints and the `tasks` model remain temporarily for rollback compatibility. They are no longer used by the Study Matrix frontend. Do not drop the old table as part of this update; remove it only after verifying no other deployment or workflow depends on it and after taking a database backup.
=======
Do not use `docker compose down -v` unless you intend to delete the database
and Grafana data volumes.

## Node development and checks

Requirements: Node.js 22 and npm.

```bash
cd frontend
npm ci
npm run format:check
npm run typecheck
npm run build
cd ..
```

From the repository root, use `npm --prefix frontend run format` to format the
project source, documentation, and configuration files. `make format` also
formats Terraform files.

The end-to-end API smoke test runs against a started Compose stack:

```bash
docker compose up --build -d api db nginx
bash scripts/api-smoke-test.sh http://127.0.0.1:8080
```

## API

| Method             | Path                    | Purpose                                                         |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| GET                | `/api/health`           | Next.js service liveness                                        |
| GET                | `/api/ready`            | Readiness including PostgreSQL connectivity                     |
| GET                | `/api/metrics`          | Private Prometheus metrics endpoint (not exposed through Nginx) |
| GET, POST          | `/api/tasks`            | List or create tasks                                            |
| GET, PATCH, DELETE | `/api/tasks/:id`        | Read, update, or delete a task                                  |
| GET                | `/api/auth/csrf`        | Issue a CSRF token                                              |
| POST               | `/api/auth/login`       | Sign in using `STUDY_APP_PASSWORD`                              |
| GET                | `/api/auth/me`          | Check the signed-in session                                     |
| POST               | `/api/auth/logout`      | Sign out                                                        |
| GET                | `/api/study/state`      | Read authenticated study data                                   |
| PUT, DELETE        | `/api/study/state/:key` | Save or delete authenticated study data                         |

Task routes retain the original JSON API behavior. Study-state routes require
an authenticated session and CSRF protection for writes. Production must set a
stable signing secret and a private study password; the development defaults
must not be used for a public deployment.

## Project layout
>>>>>>> integration/nextjs-main

- `frontend/` — Next.js app, API route handlers, and preserved matrix template
- `compose.yaml`, `Dockerfile`, `docker/` — Node.js/PostgreSQL stack and Nginx
- `monitoring/` — Prometheus and Grafana configuration
- `.github/workflows/` — Node checks, image publishing, and deployment workflow
- `terraform/`, `ansible/` — optional cloud infrastructure learning exercises
- `docs/` — architecture, learning path, and operations runbooks

<<<<<<< HEAD
- `app/` — Flask app, API routes, SQLAlchemy models, and existing study UI
- `tests/` — API, persistence, CSRF, and authentication checks
- `docker/` — Nginx reverse-proxy configuration
- `monitoring/` — Prometheus/Grafana configuration
- `.github/workflows/` — CI, GHCR publishing, deployment workflow
- `terraform/` and `ansible/` — infrastructure and host configuration
- `scripts/` — tests, smoke tests, pre-deployment checks, local deployment helper
- `docs/` — architecture and operational runbooks

Production-specific instructions are in [`docs/STUDY_MATRIX_DEPLOYMENT.md`](docs/STUDY_MATRIX_DEPLOYMENT.md).

## Existing data and migration notes

- Browser-local data is never migrated automatically; use the explicit empty-state recovery flow.
- Existing PostgreSQL data is not dropped or rewritten by this update.
- Existing `tasks` table and Docker volumes are retained for rollback.
- Before production rollout, back up PostgreSQL and verify the new image locally. If old localStorage data is important, keep a JSON backup from the existing UI before switching versions.
=======
## Operations and safety

This is a learning project, not a hardened production service. Review the
security checklist, production secrets, database backup/restore process,
network exposure, TLS configuration, and rollback procedure before deploying.
Terraform can create billable AWS resources; review every plan before applying.
Never commit `.env`, Terraform state, credentials, or SSH private keys.
>>>>>>> integration/nextjs-main
