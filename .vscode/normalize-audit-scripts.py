from pathlib import Path

root = Path(__file__).parent
for name in (
    "smoke-release-image.sh",
    "verify-local-metrics.sh",
    "inspect-production-config.sh",
    "../deploy/production/taskflow/taskflow-deploy",
):
    path = root / name
    path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
    print(f"Normalized line endings: {name}")
