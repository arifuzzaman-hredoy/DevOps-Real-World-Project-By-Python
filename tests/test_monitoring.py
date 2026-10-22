import json
from pathlib import Path


ROOT = Path(__file__).parents[1]


def test_grafana_dashboard_does_not_replace_missing_metrics_with_zero():
    dashboard_path = (
        ROOT / "monitoring" / "production" / "grafana" / "dashboards"
        / "taskflow-production.json"
    )
    dashboard = json.loads(dashboard_path.read_text(encoding="utf-8"))
    panels = dashboard["panels"]

    error_rate = next(panel for panel in panels if panel["id"] == 10)
    error_rate_expression = error_rate["targets"][0]["expr"]

    assert "or vector(0)" not in error_rate_expression
    assert error_rate["fieldConfig"]["defaults"]["noValue"] == "No data"


def test_proxy_configs_block_public_metrics_without_blocking_internal_scrape():
    nginx_configs = (
        ROOT / "docker" / "nginx.conf",
        ROOT / "deploy" / "production" / "taskflow" / "nginx.conf",
    )
    for config_path in nginx_configs:
        config = config_path.read_text(encoding="utf-8")
        assert "location = /api/metrics {\n        return 404;\n    }" in config
        assert "location ^~ /api/metrics/ {\n        return 404;\n    }" in config

    prometheus = (
        ROOT / "monitoring" / "production" / "prometheus" / "prometheus.yml"
    ).read_text(encoding="utf-8")
    assert 'metrics_path: /api/metrics' in prometheus
    assert 'targets: ["api:5000"]' in prometheus
