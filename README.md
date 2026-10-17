# DevOps Real-World Learning Project: TaskFlow

TaskFlow is a small task-management API used as the application for an end-to-end DevOps learning journey. The repository is intentionally structured like a real delivery project: application, tests, containerization, local orchestration, reverse proxy, monitoring, CI, infrastructure-as-code, configuration management, and operational runbooks.

## What you will build

**Phase 1 — Application and Git**
- Python Flask REST API
- PostgreSQL persistence
- Unit/integration tests and linting
- Git branching, pull requests, tags, releases

**Phase 2 — Containers**
- Docker image
- Docker Compose environment
- Nginx reverse proxy
- Persistent database volume and health checks

**Phase 3 — CI/CD**
- GitHub Actions tests and image build
- Container image publishing to GitHub Container Registry (GHCR)
- Deployment workflow foundation (deployment is deliberately gated until credentials and infrastructure are configured)

**Phase 4 — Cloud**
- Terraform provisions an AWS security group and EC2 instance
- Ansible installs Docker and deploys the application
- DNS/subdomain and HTTPS setup guide

**Phase 5 — Observability and operations**
- Prometheus metrics
- Grafana provisioning
- Health/readiness endpoints
- Incident, backup, restore, rollback, and troubleshooting runbooks

**Phase 6 — Advanced extensions**
- Add Redis caching and Celery workers
- Add Kubernetes (kind locally, then EKS only if budget allows)
- Add Trivy image scanning, SBOM, dependency scanning, and policy checks
- Add centralized logs and alerting

## Important safety and cost notes

- No real credentials are included. Never commit AWS keys, SSH private keys, tokens, passwords, or `.env` files.
- The Terraform example can create billable AWS resources. Review `terraform plan` before applying and destroy resources when finished.
- The AWS setup is a learning baseline, not a hardened production architecture. Production would need TLS termination, restricted ingress, IAM least privilege, secret management, backups, patching, and a multi-AZ design.
- Start locally. Do not connect cloud credentials until the local application and CI workflow pass.

## Quick start (local)

Requirements: Docker Engine and Docker Compose plugin.

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
curl http://localhost/api/health
curl http://localhost/api/tasks
```

The API is behind Nginx on `http://localhost`. PostgreSQL is not published to the host by default.
To stop:

```bash
docker compose down
```

To stop and **delete local database data**:

```bash
docker compose down -v
```

## Run tests without Docker

Python 3.12+ is recommended.

```bash
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```

The application uses SQLite automatically when `DATABASE_URL` is not set, which makes local tests easy.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/ready` | Readiness check including database connectivity |
| GET | `/api/metrics` | Prometheus metrics |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/<id>` | Read task |
| PATCH | `/api/tasks/<id>` | Update title, description, or status |
| DELETE | `/api/tasks/<id>` | Delete task |

Example:

```bash
curl -X POST http://localhost/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Learn Docker","description":"Build and inspect an image"}'
```

## Repository map

- `app/` — Flask application and database models
- `tests/` — automated tests
- `docker/` — Nginx configuration
- `monitoring/` — Prometheus and Grafana provisioning
- `.github/workflows/` — CI and image publishing
- `terraform/` — AWS EC2 and security group
- `ansible/` — host configuration and deployment
- `scripts/` — helper scripts
- `docs/` — learning plan and operational runbooks

## Recommended learning method

Do not just run every command. For each phase:
1. Read the relevant docs.
2. Draw the architecture from memory.
3. Run the commands yourself.
4. Break one thing intentionally and troubleshoot it.
5. Capture terminal output and screenshots in your learning notes.
6. Explain what happened and why before moving to the next phase.

Start with `docs/LEARNING_PATH.md`.
