# PostgreSQL backup and recovery procedure

This procedure is for the TaskFlow PostgreSQL database. Backups contain private
study data and must be treated as sensitive data. Never store them in the Git
working tree, print their contents, or attach them to an issue or chat.

## Create and verify a production backup

1. Confirm the production database and available disk space. Schedule the backup
   during a low-write period. Record the time and the selected recovery point.
2. Store the archive outside `/opt/taskflow`, in a directory restricted to the
   deployment operator:

   ```bash
   set -Eeuo pipefail
   backup_dir=/var/backups/taskflow
   sudo install -d -m 700 -o ubuntu -g ubuntu "$backup_dir"
   umask 077
   stamp=$(date -u +%Y%m%dT%H%M%SZ)
   backup_file="$backup_dir/taskflow-$stamp.dump"
   partial_file="$backup_file.partial"
   ```

3. Use PostgreSQL's custom archive format. `pg_dump` takes a consistent
transaction snapshot while writes continue. Do not place credentials on the
command line or print the Compose configuration. Write to a partial name so
an interrupted dump is not mistaken for a complete backup:

   ```bash
   cd /opt/taskflow
   sudo docker compose --env-file .env -f compose.yaml exec -T db \
     sh -ec 'pg_dump --format=custom --no-owner --username="$POSTGRES_USER" "$POSTGRES_DB"' \
     > "$partial_file"
   test -s "$partial_file"
   chmod 600 "$partial_file"
   sha256sum "$partial_file" > "$partial_file.sha256"
   sha256sum --check "$partial_file.sha256"
   mv "$partial_file" "$backup_file"
   mv "$partial_file.sha256" "$backup_file.sha256"
   chmod 600 "$backup_file" "$backup_file.sha256"
   ```

4. Verify the archive by restoring it into a disposable PostgreSQL container
   on a private, internal-only Docker network. The database uses a temporary
   filesystem, not a volume. It does not connect to or alter production:

   ```bash
   restore_name="taskflow-restore-check-$stamp"
   restore_network="$restore_name-net"
   sudo docker network create --internal \
     --label "taskflow.backup-restore-check=$stamp" "$restore_network"
   sudo docker run -d --network "$restore_network" --name "$restore_name" \
     --label "taskflow.backup-restore-check=$stamp" \
     --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev,size=1g \
     --env POSTGRES_HOST_AUTH_METHOD=trust \
     --mount "type=bind,src=$backup_file,dst=/tmp/taskflow.dump,readonly" \
     postgres:16-alpine
   if sudo docker inspect "$restore_name" >/dev/null 2>&1; then
     echo "Refusing to reuse an existing restore-test container" >&2
     exit 1
   fi
   for attempt in $(seq 1 30); do
     if sudo docker exec "$restore_name" pg_isready -U postgres >/dev/null 2>&1; then
       ready=yes
       break
     fi
     sleep 1
   done
   test "${ready:-no}" = yes
   sudo docker exec "$restore_name" pg_isready -U postgres
   sudo docker exec "$restore_name" pg_restore --list /tmp/taskflow.dump >/dev/null
   sudo docker exec "$restore_name" createdb -U postgres taskflow_recovery
   sudo docker exec "$restore_name" pg_restore --exit-on-error --no-owner \
     --username=postgres --dbname=taskflow_recovery /tmp/taskflow.dump
   sudo docker exec "$restore_name" psql --no-psqlrc --tuples-only --no-align \
     --username=postgres --dbname=taskflow_recovery \
     -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
   for table in task study_states; do
     exists=$(sudo docker exec "$restore_name" psql --no-psqlrc --tuples-only --no-align \
       --username=postgres --dbname=taskflow_recovery \
       -c "SELECT to_regclass('public.$table') IS NOT NULL")
     if [[ "$exists" == t ]]; then
       count=$(sudo docker exec "$restore_name" psql --no-psqlrc --tuples-only --no-align \
         --username=postgres --dbname=taskflow_recovery \
         -c "SELECT count(*) FROM public.$table")
       printf '%s row count: %s\n' "$table" "$count"
     else
       printf '%s table: absent in source archive\n' "$table"
     fi
   done
   ```

   Confirm the expected legacy `task` table and any expected `study_states`
   table are represented. Record table names and counts only; never query or
   display study payloads. Before cleanup, verify the exact container and
   network carry the `taskflow.backup-restore-check=$stamp` label; remove only
   those two labeled resources with `docker rm -f "$restore_name"` and
   `docker network rm "$restore_network"`. Neither command removes a volume.
5. Verify application compatibility against this restored disposable database
   using the exact candidate release image and temporary, generated-only test
   credentials. Attach the API test container to the same internal network,
   point it at `taskflow_recovery`, and check startup, health/readiness, login,
   CSRF-protected state reads/writes, and logout. The test write must target
   only this throwaway restored database; do not use production credentials or
   the production database. Remove only the labeled test API container after
   collecting its exit status and logs.
6. Encrypt the archive with the organization's approved encryption tool and
   transfer the encrypted copy to approved off-host storage. Verify its
   checksum after transfer. Keep the local copy until the off-host copy and
   restore test are verified.
7. Apply the organization's approved retention schedule and record its owner,
   retention deadline, and storage location. Never delete a backup if that
   schedule or a valid replacement copy is uncertain. For secure deletion,
   use approved encrypted-storage key destruction or the storage provider's
   secure lifecycle/crypto-erasure procedure; ordinary `rm` or `shred` is not
   proof of erasure on SSDs, snapshots, or cloud-backed storage. Record only
   UTC timestamp, byte size, SHA-256, storage location, tool/image version,
   retention deadline, and restore-test result. Do not record secrets or
   study payloads.

## Recovery decision and restore

1. Declare the incident and identify the affected database, time of failure,
   last known good backup, expected recovery point objective, and data written
   since that backup. Do not restore merely because an application deployment
   failed.
2. Preserve the current database before any recovery action. Create and verify
   a separate backup of the current database; do not overwrite the selected
   backup or reuse the live database volume for a test.
3. Restore the selected archive into a separate, isolated recovery database or
   host with restricted network access. Verify the checksum and run the same
   disposable-container restore test before using it.
4. Validate schema/table presence and application health without printing
   private rows. Compare table counts only where an authorized operator needs
   them to make the recovery decision. Keep the original database available.
5. Obtain explicit incident-owner approval for a production cutover. Prefer
   pointing the application at the separately restored database while keeping
   the original unchanged. Record the exact old and new database targets in a
   restricted operations log.
6. Verify health/readiness, login, CSRF, study-state load, and a deliberate
   non-sensitive test write. If validation fails, stop writes to the recovery
   target and switch the application back to the preserved original database.
   Never drop the original database or volume as part of the first recovery.

## Current project limitations

- SQLAlchemy's `db.create_all()` creates missing tables at application startup;
  there is no versioned migration history or schema rollback tool.
- The first Study Matrix release adds the `study_states` table while retaining
  the existing `task` table. The change is additive; do not remove or rename
  either table during the initial rollout.
- This runbook describes a procedure; it does not prove that a current
  production backup exists. Record a successful real backup and isolated
  restore test before authorizing release.
- Define approved retention, encryption, off-host storage, RPO, RTO, and
  on-call ownership before treating recovery as production-ready.
- This runbook's example uses PostgreSQL's consistent custom archive and a
  disposable restore, but a successful production backup and restore test must
  be performed and recorded by an authorized operator before release.
