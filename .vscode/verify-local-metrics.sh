#!/usr/bin/env bash
set -Eeuo pipefail

expected_config="$(sha256sum docker/nginx.conf | cut -d' ' -f1)"
actual_config="$(
  docker compose exec -T nginx sha256sum /etc/nginx/conf.d/default.conf \
    | cut -d' ' -f1
)"
if [[ "$expected_config" != "$actual_config" ]]; then
  echo "FAIL: active Nginx config does not match docker/nginx.conf" >&2
  exit 1
fi

docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload

base=http://127.0.0.1:8080
for path in \
  /api/metrics \
  '/api/metrics?format=prometheus' \
  /api/metrics/ \
  /api/metrics/extra \
  /api//metrics \
  //api/metrics \
  /api/./metrics \
  /api/other/../metrics \
  /%61pi/metrics \
  /api/%6Detrics \
  /api%2fmetrics
do
  status="$(
    curl --path-as-is --silent --show-error --output /dev/null \
      --write-out '%{http_code}' "$base$path"
  )"
  printf '%s HTTP %s\n' "$path" "$status"
  if [[ "$status" != 404 ]]; then
    echo "FAIL: public metrics path was not denied: $path" >&2
    exit 1
  fi
done

for path in /api/health /api/ready; do
  status="$(
    curl --silent --show-error --output /dev/null \
      --write-out '%{http_code}' "$base$path"
  )"
  printf '%s HTTP %s\n' "$path" "$status"
  if [[ "$status" != 200 ]]; then
    echo "FAIL: public health/readiness endpoint failed: $path" >&2
    exit 1
  fi
done

internal_status="$(
  docker compose exec -T api node -e \
    'fetch("http://127.0.0.1:3000/api/metrics", { signal: AbortSignal.timeout(3000) }).then(response => { console.log(response.status); if (response.status !== 200) process.exit(1); }).catch(() => process.exit(1))'
)"
echo "Internal API /api/metrics HTTP $internal_status"
if [[ "$internal_status" != 200 ]]; then
  echo "FAIL: internal metrics endpoint unavailable" >&2
  exit 1
fi
echo "PASS: local public metrics denial and internal API metrics availability"
