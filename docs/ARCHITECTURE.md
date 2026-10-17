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
   +--> Nginx :80 --> Flask/Gunicorn API :5000 --> PostgreSQL (private Compose network)
   |
   +--> Prometheus scrapes /api/metrics --> Grafana dashboards
```

The local Compose stack mirrors the host stack. PostgreSQL is not exposed on a public host port. The initial AWS configuration is for learning only; use HTTPS, restricted admin access, managed secrets, backups, and a stronger production architecture before handling real user data.
