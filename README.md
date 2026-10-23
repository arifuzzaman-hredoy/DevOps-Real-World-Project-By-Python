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

```bash
docker compose down
```

Do not use `docker compose down -v` unless you intend to delete the database
and Grafana data volumes.

## Node development and checks

Requirements: Node.js 22 and npm.

```bash
cd frontend
npm ci
npm run typecheck
npm run build
```

The end-to-end API smoke test runs against a started Compose stack:

```bash
docker compose up --build -d api db nginx
bash scripts/api-smoke-test.sh http://127.0.0.1:8080
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Next.js service liveness |
| GET | `/api/ready` | Readiness including PostgreSQL connectivity |
| GET | `/api/metrics` | Private Prometheus metrics endpoint (not exposed through Nginx) |
| GET, POST | `/api/tasks` | List or create tasks |
| GET, PATCH, DELETE | `/api/tasks/:id` | Read, update, or delete a task |
| GET | `/api/auth/csrf` | Issue a CSRF token |
| POST | `/api/auth/login` | Sign in using `STUDY_APP_PASSWORD` |
| GET | `/api/auth/me` | Check the signed-in session |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/study/state` | Read authenticated study data |
| PUT, DELETE | `/api/study/state/:key` | Save or delete authenticated study data |

Task routes retain the original JSON API behavior. Study-state routes require
an authenticated session and CSRF protection for writes. Production must set a
stable signing secret and a private study password; the development defaults
must not be used for a public deployment.

## Project layout

- `frontend/` — Next.js app, API route handlers, and preserved matrix template
- `compose.yaml`, `Dockerfile`, `docker/` — Node.js/PostgreSQL stack and Nginx
- `monitoring/` — Prometheus and Grafana configuration
- `.github/workflows/` — Node checks, image publishing, and deployment workflow
- `terraform/`, `ansible/` — optional cloud infrastructure learning exercises
- `docs/` — architecture, learning path, and operations runbooks

## Operations and safety

This is a learning project, not a hardened production service. Review the
security checklist, production secrets, database backup/restore process,
network exposure, TLS configuration, and rollback procedure before deploying.
Terraform can create billable AWS resources; review every plan before applying.
Never commit `.env`, Terraform state, credentials, or SSH private keys.
