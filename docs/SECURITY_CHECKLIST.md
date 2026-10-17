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
