# Architecture

```text
Browser: React/TypeScript academic dashboard and Study Matrix
   | same-origin session cookie + CSRF-protected requests
   v
Nginx reverse proxy
   | production API image includes built React assets
   v
Flask + Gunicorn
   |-- Login/session and access-control middleware
   |-- Study-state API + health/readiness
   |-- Prometheus metrics (internal scrape path)
   v
PostgreSQL
   `-- study_states: allow-listed JSON documents with update timestamps

GitHub Actions -> backend/frontend checks -> GHCR -> manual, immutable-tag deployment
AWS EC2 -> Nginx/TLS -> Flask API + React assets -> private PostgreSQL network
Prometheus -> internal API/node-exporter targets -> Grafana dashboards
```

The React/TypeScript dashboard is the primary frontend. The API image contains
the production Vite build so the existing production Nginx reverse proxy can
continue forwarding requests to Flask. Local Compose uses a dedicated Nginx
container to serve static assets. The authenticated `/legacy` route keeps the
existing Jinja page available while its Admin, study hub, focus timer, and
export/print features are not yet ported to React.

Browser-local plan data is not uploaded automatically. When no server plan
exists, the dashboard offers explicit recovery from a verified local plan or a
supported JSON file. Existing server-side plan and progress documents are not
overwritten by that recovery path.

`study_states` is a JSON-document persistence layer chosen to minimize regression risk in the first migration. A future version can normalize subjects, chapters, progress, cards, reviews, and exams into relational tables after behavior and data migration are tested.

Health/readiness endpoints remain available to infrastructure checks. User data
endpoints require an authenticated session; writes require a CSRF token.
Production Compose requires unique `SECRET_KEY` and `STUDY_APP_PASSWORD`
settings. The deployment workflow accepts manual dispatch only with an immutable
`sha-<40-character commit SHA>` image tag. Back up the existing database and
verify the previous image rollback target before an approved rollout.
