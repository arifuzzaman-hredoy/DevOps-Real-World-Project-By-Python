from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from flask import Response, request, g
import time

REQUESTS = Counter("taskflow_http_requests_total", "HTTP requests", ["method", "endpoint", "status"])
LATENCY = Histogram("taskflow_http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"])

def install_metrics(app):
    @app.before_request
    def start_timer():
        g._taskflow_started_at = time.perf_counter()

    @app.after_request
    def record_metrics(response):
        endpoint = request.endpoint or "unmatched"
        REQUESTS.labels(request.method, endpoint, str(response.status_code)).inc()
        started = getattr(g, "_taskflow_started_at", None)
        if started is not None:
            LATENCY.labels(request.method, endpoint).observe(time.perf_counter() - started)
        return response

    @app.get("/api/metrics")
    def metrics():
        return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)
