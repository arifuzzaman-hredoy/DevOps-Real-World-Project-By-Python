cd /opt/taskflow || exit 1

echo "========== 1. CURRENT COMPOSE FILE =========="
sudo sed -n '1,240p' /opt/taskflow/compose.yaml

echo "========== 2. ACTIVE NGINX CONFIG =========="
sudo grep -nE \
  'server_name|listen 443|proxy_pass|location /|location = /api/ready|ssl_certificate|grafana' \
  /opt/taskflow/nginx.conf

echo "========== 3. SAVED PRE-NEXTJS CONFIG =========="
if sudo test -f /opt/taskflow/.pre-nextjs-migration/compose.yaml; then
  sudo grep -nE \
    'image:|build:|healthcheck:|5000|3000|service:|api:' \
    /opt/taskflow/.pre-nextjs-migration/compose.yaml
else
  echo "No saved Compose file"
fi

if sudo test -f /opt/taskflow/.pre-nextjs-migration/nginx.conf; then
  sudo grep -nE \
    'server_name|listen|proxy_pass|location|5000|3000|grafana' \
    /opt/taskflow/.pre-nextjs-migration/nginx.conf
else
  echo "No saved Nginx config"
fi

echo "========== 4. RUNNING IMAGE METADATA =========="
sudo docker image inspect \
  ghcr.io/arifuzzaman-hredoy/devops-real-world-project-by-python:sha-2c8844b5a822da55e15958a27290e7940d1537c9 \
  --format 'Created={{.Created}} OS={{.Os}} Architecture={{.Architecture}} Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}}'

echo "========== 5. CURRENT COMPOSE IMAGE METADATA =========="
sudo docker image inspect \
  ghcr.io/arifuzzaman-hredoy/devops-real-world-project-by-python:sha-1b44031ab14dc8a804d1585d32f8612606f9f4da \
  --format 'Created={{.Created}} ID={{.Id}} Entrypoint={{json .Config.Entrypoint}} Cmd={{json .Config.Cmd}}' \
  2>&1 || true

echo "========== 6. DEPLOY HELPER IMAGE AND ROLLBACK LOGIC =========="
sudo sed -n '175,275p' /usr/local/bin/taskflow-deploy

echo "========== 7. NGINX UPSTREAM AND READINESS =========="
sudo docker exec taskflow-nginx-1 nginx -T 2>&1 |
  grep -nE -A 5 -B 5 \
  'server_name taskflow.oxytumzone.com|proxy_pass http://api:3000|proxy_pass http://api:5000|location = /api/ready'

echo "========== 8. API HEALTH AND RECENT ERRORS =========="
sudo docker inspect taskflow-api-1 \
  --format 'Status={{.State.Status}} Health={{.State.Health.Status}} Restarts={{.RestartCount}}'

sudo docker logs --since 5m taskflow-api-1 2>&1 |
  grep -c 'failed-to-find-server-action' || true

echo "========== 9. PUBLIC READINESS =========="
curl -sS -i --max-time 10 \
  https://taskflow.oxytumzone.com/api/ready

echo
echo "========== DIAGNOSTICS COMPLETE =========="
