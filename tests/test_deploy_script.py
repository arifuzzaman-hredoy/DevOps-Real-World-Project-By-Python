import json
import os
import subprocess
from pathlib import Path

import pytest


REPOSITORY = "ghcr.io/arifuzzaman-hredoy/devops-real-world-project-by-python"
TAG = "sha-cf8d1167d9ab42a5efc2b92e95b60e5ec041bd84"
OLD_IMAGE_ID = "sha256:" + "a" * 64
NEW_IMAGE_ID = "sha256:" + "b" * 64
OLD_IMAGE_DIGEST = REPOSITORY + "@sha256:" + "c" * 64
SCRIPT = (
    Path(__file__).parents[1]
    / "devops"
    / "deploy"
    / "production"
    / "taskflow"
    / "taskflow-deploy"
)


MOCK_DOCKER = r"""#!/usr/bin/env python3
import json
import os
import sys

state_file = os.environ["MOCK_STATE"]
with open(state_file, encoding="utf-8") as stream:
    state = json.load(stream)
args = sys.argv[1:]
state["commands"].append(args)
scenario = state["scenario"]
result = 0

if args[:1] == ["pull"]:
    result = int(scenario == "pull_fail")
elif args[:2] == ["image", "inspect"]:
    image = args[2]
    if image == state["old_image_id"]:
        if scenario == "missing_previous":
            output = ""
        elif scenario == "invalid_previous":
            output = state["repository"] + "@sha256:invalid"
        else:
            output = state["old_digest"]
    elif image == state["old_digest"]:
        output = (
            "sha256:" + "d" * 64
            if scenario == "previous_reference_mismatch"
            else state["old_image_id"]
        )
    elif image == state["new_image"]:
        output = state["new_image_id"]
    else:
        output = ""
        result = 1
    if result == 0:
        print(output)
elif args[:1] == ["inspect"]:
    template = args[2] if len(args) > 2 and args[1] == "--format" else ""
    if template == "{{.State.Running}}":
        print("true")
    elif template == "{{.Image}}":
        if (
            scenario == "rollback_mismatch"
            and state["rollback_count"] > 0
            and state["image_id"] == state["old_image_id"]
        ):
            print("sha256:" + "d" * 64)
        else:
            print(state["image_id"])
    else:
        result = 1
elif args[:1] == ["compose"]:
    if args[-2:] == ["config", "--quiet"]:
        pass
    elif args[-5:] == ["up", "-d", "--no-deps", "--force-recreate", "nginx"]:
        state["nginx_recreate_count"] += 1
    elif len(args) >= 4 and args[-4:] == ["up", "-d", "--no-deps", "api"]:
        image = os.environ.get("TASKFLOW_API_IMAGE", "")
        if image == state["new_image"]:
            state["new_up_count"] += 1
            if scenario == "compose_fail":
                result = 1
            else:
                state["image_id"] = state["new_image_id"]
                state["phase"] = "new"
                if scenario == "compose_partial_fail":
                    result = 1
        elif image == state["old_digest"]:
            state["rollback_count"] += 1
            if scenario == "rollback_command_fail":
                result = 1
            else:
                state["image_id"] = state["old_image_id"]
                state["phase"] = "old"
        else:
            result = 1
        state.setdefault("compose_images", []).append(image)
    else:
        result = 1
elif args[:1] == ["exec"]:
    if len(args) > 2 and args[2] == "node":
        state.setdefault("internal_readiness_phases", []).append(state["phase"])
        is_rollback = state["rollback_count"] > 0
        if state["phase"] == "new" and scenario in {
            "internal_fail",
            "rollback_command_fail",
            "rollback_mismatch",
            "rollback_internal_fail",
            "rollback_public_fail",
            "rollback_database_unavailable",
        }:
            result = 1
        if is_rollback and scenario == "rollback_internal_fail":
            result = 1
elif args[:1] == ["image"]:
    result = 1
else:
    result = 1

with open(state_file, "w", encoding="utf-8") as stream:
    json.dump(state, stream)
raise SystemExit(result)
"""


MOCK_SUDO = r"""#!/bin/sh
if [ "${1-}" = "--preserve-env=TASKFLOW_API_IMAGE" ]; then
    shift
fi
exec "$@"
"""


MOCK_CURL = r"""#!/usr/bin/env python3
import json
import os
import stat
import sys

state_file = os.environ["MOCK_STATE"]
with open(state_file, encoding="utf-8") as stream:
    state = json.load(stream)
state.setdefault("public_readiness_phases", []).append(state["phase"])
args = sys.argv[1:]
state["commands"].append(["curl", *args])
is_rollback = state["rollback_count"] > 0
failed = (
    state["phase"] == "new" and state["scenario"] == "public_fail"
) or (
    is_rollback and state["scenario"] == "rollback_public_fail"
)
output_path = args[args.index("--output") + 1]
if failed:
    status = "503"
else:
    status = "200"
    database_status = "error" if (
        state["phase"] == "new" and state["scenario"] == "public_database_unavailable"
    ) or (
        is_rollback and state["scenario"] == "rollback_database_unavailable"
    ) else "ok"
    with open(output_path, "w", encoding="utf-8") as response_file:
        json.dump({"status": "ready", "database": database_status}, response_file)
state["response_mode"] = stat.S_IMODE(os.stat(output_path).st_mode)
state["response_dir_mode"] = stat.S_IMODE(os.stat(os.path.dirname(output_path)).st_mode)
with open(state_file, "w", encoding="utf-8") as stream:
    json.dump(state, stream)
print(status)
raise SystemExit(int(failed))
"""


MOCK_SLEEP = "#!/bin/sh\nexit 0\n"


def _write_executable(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    path.chmod(0o700)


def run_deployment(
    tmp_path: Path, scenario: str, with_rollback_config: bool = False
):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    _write_executable(bin_dir / "sudo", MOCK_SUDO)
    _write_executable(bin_dir / "docker", MOCK_DOCKER)
    _write_executable(bin_dir / "curl", MOCK_CURL)
    _write_executable(bin_dir / "sleep", MOCK_SLEEP)

    state_path = tmp_path / "mock-state.json"
    temp_dir = tmp_path / "private-tmp"
    temp_dir.mkdir()
    state = {
        "scenario": scenario,
        "repository": REPOSITORY,
        "old_image_id": OLD_IMAGE_ID,
        "new_image_id": NEW_IMAGE_ID,
        "old_digest": OLD_IMAGE_DIGEST,
        "new_image": f"{REPOSITORY}:{TAG}",
        "image_id": OLD_IMAGE_ID,
        "phase": "old",
        "new_up_count": 0,
        "rollback_count": 0,
        "nginx_recreate_count": 0,
        "commands": [],
    }
    state_path.write_text(json.dumps(state), encoding="utf-8")

    env = os.environ.copy()
    env["PATH"] = str(bin_dir) + os.pathsep + env["PATH"]
    env["MOCK_STATE"] = str(state_path)
    env["TMPDIR"] = str(temp_dir)
    env.pop("TASKFLOW_API_IMAGE", None)
    if with_rollback_config:
        app_dir = tmp_path / "taskflow"
        app_dir.mkdir()
        (app_dir / "compose.yaml").write_text("candidate compose\n", encoding="utf-8")
        (app_dir / "nginx.conf").write_text("candidate nginx\n", encoding="utf-8")
        rollback_dir = tmp_path / "rollback"
        rollback_dir.mkdir()
        (rollback_dir / "compose.yaml").write_text("previous compose\n", encoding="utf-8")
        (rollback_dir / "nginx.conf").write_text("previous nginx\n", encoding="utf-8")
        env["TASKFLOW_APP_DIR"] = str(app_dir)
        env["TASKFLOW_ROLLBACK_CONFIG_DIR"] = str(rollback_dir)
    result = subprocess.run(
        ["bash", str(SCRIPT), TAG],
        cwd=tmp_path,
        env=env,
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )
    final_state = json.loads(state_path.read_text(encoding="utf-8"))
    return result, final_state


@pytest.mark.parametrize(
    ("scenario", "expected_status", "expected_rollbacks"),
    [
        ("success", 0, 0),
        ("pull_fail", 1, 1),
        ("compose_fail", 1, 1),
        ("compose_partial_fail", 1, 1),
        ("internal_fail", 1, 1),
        ("public_fail", 1, 1),
        ("public_database_unavailable", 1, 1),
        ("rollback_command_fail", 1, 1),
        ("rollback_mismatch", 1, 1),
        ("rollback_internal_fail", 1, 1),
        ("rollback_public_fail", 1, 1),
        ("rollback_database_unavailable", 1, 1),
    ],
)
def test_deployment_and_rollback_scenarios(
    tmp_path, scenario, expected_status, expected_rollbacks
):
    result, state = run_deployment(tmp_path, scenario)

    assert result.returncode == expected_status, result.stderr + result.stdout
    assert state["rollback_count"] == expected_rollbacks
    if expected_rollbacks:
        expected_images = (
            [state["old_digest"]]
            if scenario == "pull_fail"
            else [state["new_image"], state["old_digest"]]
        )
        assert state["compose_images"] == expected_images
        compose_commands = [
            command for command in state["commands"] if command[:1] == ["compose"]
        ]
        assert any(
            command[-4:] == ["up", "-d", "--no-deps", "api"]
            for command in compose_commands
        )
        assert sum(command[:1] == ["exec"] for command in state["commands"]) >= 1
        assert sum(command[:1] == ["curl"] for command in state["commands"]) >= 1
    if scenario == "success":
        assert state["image_id"] == NEW_IMAGE_ID
        assert state["nginx_recreate_count"] == 1
        assert "SUCCESS: TaskFlow deployment is healthy." in result.stdout
    if scenario in {
        "pull_fail",
        "compose_fail",
        "compose_partial_fail",
        "internal_fail",
        "public_fail",
        "public_database_unavailable",
    }:
        assert state["image_id"] == OLD_IMAGE_ID
        assert "rollback succeeded and was verified" in result.stdout
        assert result.returncode != 0
    if scenario == "compose_partial_fail":
        assert state["compose_images"] == [state["new_image"], state["old_digest"]]
        assert state["image_id"] == OLD_IMAGE_ID
        assert "old" in state["internal_readiness_phases"]
        assert "old" in state["public_readiness_phases"]
    if scenario in {
        "rollback_command_fail",
        "rollback_mismatch",
        "rollback_internal_fail",
        "rollback_public_fail",
        "rollback_database_unavailable",
    }:
        assert "rollback verification failed" in result.stdout


@pytest.mark.parametrize(
    "scenario",
    ["missing_previous", "invalid_previous", "previous_reference_mismatch"],
)
def test_unusable_previous_image_refuses_to_begin_deployment(tmp_path, scenario):
    result, state = run_deployment(tmp_path, scenario)

    assert result.returncode != 0
    assert state["new_up_count"] == 0
    assert not any(command[:1] == ["pull"] for command in state["commands"])
    assert state["rollback_count"] == 0


def test_only_api_service_is_updated_and_no_destructive_docker_commands_run(tmp_path):
    result, state = run_deployment(tmp_path, "success")

    assert result.returncode == 0
    assert state["compose_images"] == [state["new_image"]]
    assert state["nginx_recreate_count"] == 1
    for command in state["commands"]:
        if command[:1] == ["compose"]:
            assert (
                command[-4:] == ["up", "-d", "--no-deps", "api"]
                or command[-5:]
                == ["up", "-d", "--no-deps", "--force-recreate", "nginx"]
                or command[-2:] == ["config", "--quiet"]
            )
        assert command[:2] not in (
            ["compose", "down"],
            ["system", "prune"],
            ["volume", "rm"],
            ["image", "prune"],
            ["container", "prune"],
        )
        assert command[:1] not in (["rm"], ["prune"])


def test_public_health_payload_is_private_and_cleaned_up(tmp_path):
    result, state = run_deployment(tmp_path, "success")

    assert result.returncode == 0
    assert state["response_mode"] == 0o600
    assert state["response_dir_mode"] == 0o700
    assert list((tmp_path / "private-tmp").iterdir()) == []
    assert '"database": "ok"' not in result.stdout


def test_rollback_restores_config_before_recreating_nginx(tmp_path):
    result, state = run_deployment(
        tmp_path, "public_fail", with_rollback_config=True
    )

    assert result.returncode != 0
    assert "rollback succeeded and was verified" in result.stdout
    assert (tmp_path / "taskflow" / "compose.yaml").read_text(
        encoding="utf-8"
    ) == "previous compose\n"
    assert (tmp_path / "taskflow" / "nginx.conf").read_text(
        encoding="utf-8"
    ) == "previous nginx\n"
    assert state["nginx_recreate_count"] == 2


def test_script_rejects_mutable_or_non_sha_tags(tmp_path):
    env = os.environ.copy()
    result = subprocess.run(
        ["bash", str(SCRIPT), "latest"],
        cwd=tmp_path,
        env=env,
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )

    assert result.returncode == 2
    assert "sha-<40-character lowercase commit SHA>" in result.stderr
