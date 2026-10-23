cd "/mnt/g/My Skill Learn Plan/Technology/Cloud & DevOps/DevSecOps/DevOps/Portfolio Project/devops-real-world-project"

python3 - <<'PY'
from pathlib import Path
import re

source = Path("backend/app/api/[...path]/route.ts")
compose = Path("devops/compose.yaml")

source_text = source.read_text()
compose_text = compose.read_text()

# Verify backend source before making changes.
if source_text.count("process.env.NODE_ENV") != 4:
    raise SystemExit("STOP: Expected exactly 4 NODE_ENV references.")

# Locate top-level Compose services, not nested dependency entries.
def get_service(text, name):
    pattern = rf"(?ms)^  {re.escape(name)}:\n(.*?)(?=^  [A-Za-z0-9_-]+:\n|\Z)"
    matches = list(re.finditer(pattern, text))
    if len(matches) != 1:
        raise SystemExit(
            f"STOP: Expected exactly one top-level {name} service; found {len(matches)}."
        )
    return matches[0]

backend_match = get_service(compose_text, "backend")
grafana_match = get_service(compose_text, "grafana")

backend_section = backend_match.group(1)
grafana_section = grafana_match.group(1)

old_env = "      NODE_ENV: ${APP_ENV:-development}"
if backend_section.count(old_env) != 1:
    raise SystemExit("STOP: Backend NODE_ENV setting did not match exactly once.")

old_port = '      - "3001:3000"'
if grafana_section.count(old_port) != 1:
    raise SystemExit("STOP: Grafana port mapping did not match exactly once.")

# Prepare all changes in memory first.
updated_source = source_text.replace(
    "process.env.NODE_ENV", "process.env.APP_ENV"
)

updated_backend = backend_section.replace(
    old_env,
    "      NODE_ENV: production\n      APP_ENV: ${APP_ENV:-development}",
    1,
)
updated_grafana = grafana_section.replace(
    old_port, '      - "3002:3000"', 1
)

# Apply service-specific replacements, from later section to earlier section.
updated_compose = compose_text
for match, replacement in sorted(
    [
        (backend_match, updated_backend),
        (grafana_match, updated_grafana),
    ],
    key=lambda item: item[0].start(),
    reverse=True,
):
    updated_compose = (
        updated_compose[:match.start(1)]
        + replacement
        + updated_compose[match.end(1):]
    )

# Write only after every validation has passed.
source.write_text(updated_source)
compose.write_text(updated_compose)

print("SUCCESS: Backend runtime checks now use APP_ENV.")
print("SUCCESS: Backend NODE_ENV is production.")
print("SUCCESS: Backend APP_ENV defaults to development.")
print("SUCCESS: Grafana host port changed to 3002.")
PY