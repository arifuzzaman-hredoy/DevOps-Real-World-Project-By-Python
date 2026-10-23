# Monitoring

After `docker compose up -d`:

- Prometheus: http://localhost:9091
- Grafana: http://localhost:3001 (username `admin`; password is in `.env` as `GRAFANA_ADMIN_PASSWORD` or the local Compose fallback)

The Next.js API exports request totals and latency histograms at
`/api/metrics`. Useful PromQL:

- `sum(rate(taskflow_http_requests_total[5m]))`
- `histogram_quantile(0.95, sum by (le) (rate(taskflow_http_request_duration_seconds_bucket[5m])))`
- `sum by (status) (rate(taskflow_http_requests_total[5m]))`

The provisioned dashboard scrapes the Node.js API via the private Compose
network. Do not expose Prometheus or Grafana publicly without authentication
and network restrictions.
