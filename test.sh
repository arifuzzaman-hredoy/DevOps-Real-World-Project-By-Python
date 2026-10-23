cd /opt/taskflow || exit 1

echo "========== RUNNING SERVICES =========="
sudo docker compose ps

echo
echo "========== RUNNING API IMAGE =========="
sudo docker inspect taskflow-api-1 \
  --format 'Image={{.Config.Image}} | Created={{.Created}}'

echo
echo "========== CONFIGURED IMAGES =========="
sudo docker compose config --images

echo
echo "========== LATEST MAIN COMMIT =========="
git ls-remote https://github.com/arifuzzaman-hredoy/DevOps-Real-World-Project-By-Python.git refs/heads/main

echo
echo "========== PUBLIC HEALTH CHECK =========="
curl -sS -w '\nHTTP_STATUS=%{http_code}\n' \
  https://taskflow.oxytumzone.com/api/ready

echo
echo "========== API LOGS =========="
sudo docker logs --tail 40 taskflow-api-1 2>&1
