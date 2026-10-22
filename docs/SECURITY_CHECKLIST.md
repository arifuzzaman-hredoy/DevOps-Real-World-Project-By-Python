# Security checklist

- [ ] `.env`, private keys, Terraform state, and real credentials are not committed.
- [ ] SSH ingress is limited to your own IP (`/32`).
- [ ] Grafana and Prometheus are not publicly exposed in cloud security groups.
- [ ] Production secrets are long, unique, and rotated.
- [ ] Ansible secrets are encrypted with Ansible Vault.
- [ ] Application runs as a non-root user in its container.
- [ ] Database is reachable only on the private Compose network.
- [ ] HTTPS is enabled before using a public domain for anything sensitive.
- [ ] OS and container images are patched.
- [ ] CI includes tests, dependency checks, image scanning, and secret scanning.
- [ ] IAM permissions are least privilege; prefer roles over static access keys.
- [ ] Backups are encrypted, off-host, and restore-tested.


## CST Study Matrix application controls

- [ ] Configure unique `SECRET_KEY` (at least 32 random characters) and `STUDY_APP_PASSWORD` in the production environment.
- [ ] Ensure the production Compose `api` service passes both variables to the container.
- [ ] Verify `/` redirects to `/login` when no authenticated session exists.
- [ ] Verify `/api/study/state` returns HTTP 401 before login and HTTP 200 after login.
- [ ] Verify study-state writes without a valid CSRF header return HTTP 403.
- [ ] Confirm Nginx terminates HTTPS and forwards requests only to the private API network.
- [ ] Public `/api/metrics` returns 404; Prometheus scrapes `api:5000` on the private network.
- [ ] Take and verify a PostgreSQL backup before the first rollout.
- [ ] Keep the PostgreSQL volume and old `tasks` table during the initial rollout; do not run `docker compose down -v`.
- [ ] Confirm no `.env`, Terraform `*.tfvars`, `*.tfplan`, `*.tfstate`, private keys, or database files are committed.
