# Architecture

```text
Developer laptop
   | git push / pull request
   v
GitHub Actions ---- tests, lint, Docker build ----> GHCR (release tags)
   |
   | Terraform (provision) + Ansible (configure/deploy)
   v
AWS EC2 Ubuntu host
   |
   +--> Nginx :80 --> Next.js/Node.js :3000 --> PostgreSQL (private Compose network)
   |
   +--> Prometheus scrapes /api/metrics --> Grafana dashboards
```

The local Compose stack mirrors the host stack. Nginx exposes the application on
port 8080 locally; PostgreSQL is not exposed on a host port. Next.js serves the
React pages and Node.js route handlers in the same service. The initial AWS
configuration is for learning only; use HTTPS, restricted admin access,
managed secrets, backups, and a stronger production architecture before
handling real user data.
