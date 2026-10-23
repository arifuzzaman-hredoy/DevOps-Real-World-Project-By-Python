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
   +--> Nginx :80 --> Next.js frontend :3000 --> Node.js API :3001 --> PostgreSQL
   |
   +--> Prometheus scrapes backend /api/metrics --> Grafana dashboards
```

The local Compose stack mirrors the host stack. Nginx exposes the application on
port 8080 locally; PostgreSQL and the API service are not exposed on host ports.
The frontend and backend are independently built Next.js/Node.js services. The
initial AWS configuration is for learning only; use HTTPS, restricted admin
access, managed secrets, backups, and a stronger production architecture before
handling real user data.
