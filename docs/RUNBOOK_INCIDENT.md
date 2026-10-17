# Incident runbook: API unavailable

1. **Confirm impact:** `curl -i http://HOST/api/health`; record start time and symptoms.
2. **Check host:** `uptime`, `df -h`, `free -h`, `docker ps`, `docker compose ps`.
3. **Check logs:** `docker compose logs --tail=200 nginx api db`.
4. **Check readiness:** `curl -i http://HOST/api/ready`.
5. **Find recent change:** inspect latest Git commit, image tag, configuration, and deployment time.
6. **Mitigate:** restart only the affected service if safe; if a release caused the outage, roll back to the last known-good image/revision.
7. **Verify:** health and readiness pass, create/read a smoke-test task, and inspect metrics.
8. **Communicate:** state impact, current status, next update time, and recovery.
9. **After recovery:** preserve logs, document timeline, root cause, contributing factors, and follow-up owners.

Do not delete the database volume as a troubleshooting shortcut.
