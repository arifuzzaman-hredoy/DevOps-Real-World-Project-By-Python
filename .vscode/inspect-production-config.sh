#!/usr/bin/env bash
set -Eeuo pipefail

ssh -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -i "$HOME/.ssh/taskflow_actions" ubuntu@15.135.69.202 'sudo bash -s' <<'REMOTE'
set -Eeuo pipefail
cd /opt/taskflow

declare -A env_file=()
declare -A runtime=()

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  env_file["$key"]="$value"
done < /opt/taskflow/.env

container="$(docker compose --env-file .env ps -q api)"
if [[ -z "$container" ]]; then
  echo "No TaskFlow Node.js API container is running." >&2
  exit 1
fi

while IFS= read -r line; do
  [[ "$line" == *=* ]] && runtime["${line%%=*}"]="${line#*=}"
done < <(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$container")

report() {
  printf '%s: %s\n' "$1" "$2"
}

report "APP_ENV in .env" "$([[ "${env_file[APP_ENV]:-}" == production ]] && echo present || echo absent)"
report "NODE_ENV in running container" "$([[ "${runtime[NODE_ENV]:-}" == production ]] && echo present || echo absent)"

for name in SECRET_KEY STUDY_APP_PASSWORD; do
  configured="${env_file[$name]:-}"
  active="${runtime[$name]:-}"
  minimum=16
  [[ "$name" == SECRET_KEY ]] && minimum=32
  valid=false
  if [[ ${#configured} -ge $minimum && "$configured" != replace-with* && "$configured" != dev-only* ]]; then
    valid=true
  fi
  report "$name in .env" "$([[ -n "$configured" ]] && echo present || echo absent)"
  report "$name policy" "$([[ "$valid" == true ]] && echo pass || echo fail)"
  report "$name in running container" "$([[ ${#active} -ge $minimum ]] && echo present || echo absent)"
  report "$name matches running container" "$([[ -n "$configured" && "$configured" == "$active" ]] && echo yes || echo no)"
done

database_url="${runtime[DATABASE_URL]:-}"
report "PostgreSQL DATABASE_URL in running container" "$([[ "$database_url" == postgresql://* || "$database_url" == postgresql+* ]] && echo present || echo absent)"

for name in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD; do
  report "$name in .env" "$([[ -n "${env_file[$name]:-}" ]] && echo present || echo absent)"
done

if docker exec "$container" test -f /app/server.js; then
  report "Next.js standalone server in image" present
else
  report "Next.js standalone server in image" absent
  exit 1
fi
image_id="$(docker inspect --format '{{.Image}}' "$container")"
printf 'Running Node.js API image id: %s\n' "$image_id"
REMOTE
