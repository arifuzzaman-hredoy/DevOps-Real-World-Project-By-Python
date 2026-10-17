# Monitoring

After `docker compose up -d`:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (default local username `admin`; password is in `.env` as `GRAFANA_ADMIN_PASSWORD` or the compose fallback)

Useful PromQL:
- `sum(rate(taskflow_http_requests_total[5m]))`
- `histogram_quantile(0.95, sum by (le) (rate(taskflow_http_request_duration_seconds_bucket[5m])))`
- `sum by (status) (rate(taskflow_http_requests_total[5m]))`

These dashboards are a starter setup. Add alert rules and a dashboard JSON as an exercise.
Do not expose Prometheus or Grafana publicly without authentication and network restrictions.
