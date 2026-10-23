# Database backup and restore (local Compose example)

## Backup

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backups/taskflow-$(date +%F-%H%M).sql"
```

If your shell does not have the variables loaded, read them from `.env` or use the actual local database/user names. Keep backups outside the container and protect them as sensitive data.

## Restore to a fresh database

1. Stop writes / put the app into maintenance mode.
2. Create a separate test database or a fresh disposable environment.
3. Restore with `psql -v ON_ERROR_STOP=1 -U USER -d DATABASE < backup.sql`.
4. Verify task counts and sample records.
5. Only then plan a production restore.

This is a learning runbook, not a complete disaster-recovery policy. Define retention, encryption, off-host storage, recovery point objective (RPO), and recovery time objective (RTO).
