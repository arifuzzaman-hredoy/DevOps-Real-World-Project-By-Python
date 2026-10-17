# Learning path (work through in order)

## Stage 0 — Establish your baseline
Learn the difference between development, test, staging, and production. Install Git, Docker, Docker Compose, Python, and an editor. Keep a lab notebook.

**Checkpoint:** Explain the purpose of every top-level directory.

## Stage 1 — Linux and networking
Practice users/groups, permissions, processes, systemd, disk/memory inspection, DNS, ports, HTTP, SSH, firewalls, and logs.

Commands to practice: `whoami`, `id`, `pwd`, `ls -la`, `ps aux`, `top`, `df -h`, `free -h`, `ss -lntp`, `curl -v`, `journalctl`.

**Checkpoint:** Diagnose why a service is not reachable without randomly changing settings.

## Stage 2 — Git and GitHub
Create a repository, push this project, use feature branches and pull requests, resolve a conflict, add a release tag, and protect `main`.

**Checkpoint:** Describe working tree vs staging area vs commit; explain merge vs rebase.

## Stage 3 — Python/API basics
Read `app/main.py`, `app/routes.py`, and `app/models.py`. Run tests. Add pagination, filtering by status, and stronger validation.

**Checkpoint:** Explain an HTTP request from Nginx to Flask to PostgreSQL.

## Stage 4 — Docker
Build the image, inspect layers, run a container, inspect logs, exec into it, stop/remove it, and compare a container filesystem with a named volume.

Commands: `docker build`, `docker image ls`, `docker run`, `docker ps -a`, `docker logs`, `docker exec`, `docker inspect`, `docker volume ls`.

**Checkpoint:** Explain image vs container, layer caching, non-root execution, health checks, and why the database uses a volume.

## Stage 5 — Compose and networking
Run the full stack. Stop only the API and observe recovery. Break the DB password deliberately, diagnose logs, then restore it. Confirm the DB is not published on a host port.

**Checkpoint:** Explain service DNS names, startup dependencies, health checks, networks, and persistent volumes.

## Stage 6 — CI
Push to GitHub and inspect Actions. Make a test fail and confirm CI blocks the build. Fix it. Add branch protection and require checks.

**Checkpoint:** Explain CI vs CD and why tests run before image publishing.

## Stage 7 — Registry and release
Configure GHCR package visibility and publish a version tag such as `v0.1.0`. Pin deployed images to immutable digests as a future improvement.

**Checkpoint:** Explain image tags, registry authentication, least-privilege workflow permissions, and supply-chain risk.

## Stage 8 — AWS and Terraform
Read all Terraform files. Configure the AWS CLI locally, choose a region, identify a valid Ubuntu AMI and existing key pair, then run:
`terraform init`, `terraform fmt -check`, `terraform validate`, `terraform plan`.
Only apply after reviewing the plan. Do not commit state files.

**Checkpoint:** Explain security groups, CIDR restrictions, AMIs, instance types, state, providers, resources, and outputs.

## Stage 9 — Ansible
Create a local inventory copy, set the host IP and repository URL, use Ansible Vault for passwords, test `ansible all -m ping`, then run the playbook. Review idempotency and improve the Docker installation method.

**Checkpoint:** Explain inventory, playbook, task, module, privilege escalation, Vault, and idempotency.

## Stage 10 — Domain and HTTPS
Create an A record for a subdomain pointing at the instance's public IP. Use a stable address (Elastic IP) if needed; otherwise a stop/start can change a normal public IP. Configure HTTPS with a trusted certificate and automatic renewal before real public use.

**Checkpoint:** Explain DNS A/CNAME records, TTL, TLS certificates, reverse proxies, ports 80/443, and renewal.

## Stage 11 — Observability
Open Prometheus and Grafana locally. Generate API traffic and query request count and latency. Add a dashboard and alert for elevated 5xx rate.

**Checkpoint:** Explain metrics vs logs vs traces, RED metrics, SLI/SLO, alert fatigue, and actionable alerts.

## Stage 12 — Operations and reliability
Practice backup/restore, rollback, capacity checks, and incident response using the runbooks. Write a postmortem for a simulated outage.

**Checkpoint:** Recover from a broken release without losing database data.

## Stage 13 — Security
Add Trivy image scanning, dependency scanning, secret scanning, SBOM generation, pinned GitHub Actions, and a non-root container review. Store secrets only in GitHub Actions secrets, AWS IAM roles, or a dedicated secret manager.

**Checkpoint:** Explain threat modeling, patching, least privilege, secret rotation, and image provenance.

## Stage 14 — Kubernetes (extension)
Do not jump here first. After Docker/Compose/CI are solid, deploy to kind locally, add Deployment/Service/ConfigMap/Secret/Ingress/Probes, then consider managed Kubernetes only if budget and learning goals justify it.

## Final portfolio deliverable
- Architecture diagram
- README with setup, API examples, and tradeoffs
- CI passing on `main`
- Versioned container image
- Terraform plan/apply evidence
- Ansible deployment
- Domain + HTTPS
- Grafana dashboard and alert
- Backup/restore and rollback demo
- Short incident postmortem
