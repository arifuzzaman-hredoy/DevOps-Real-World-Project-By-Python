import pytest

from app.extensions import db


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json["status"] == "ok"

def test_ready(client):
    response = client.get("/api/ready")
    assert response.status_code == 200


def test_ready_reports_database_failures_without_exposing_details(client, app, monkeypatch, caplog):
    from sqlalchemy.exc import SQLAlchemyError

    def fail_execute(*_args, **_kwargs):
        raise SQLAlchemyError("private connection detail")

    with app.app_context():
        monkeypatch.setattr(db.session, "execute", fail_execute)

    response = client.get("/api/ready")

    assert response.status_code == 503
    assert response.json == {
        "status": "not_ready",
        "database": "unavailable",
    }
    assert "SQLAlchemyError" in caplog.text
    assert "private connection detail" not in caplog.text


def test_create_and_list_task(client):
    created = client.post("/api/tasks", json={
        "title": "Learn Docker",
        "description": "Build an image"
    })
    assert created.status_code == 201
    task_id = created.json["id"]
    assert created.json["status"] == "todo"

    listed = client.get("/api/tasks")
    assert listed.status_code == 200
    assert any(task["id"] == task_id for task in listed.json)

def test_create_task_requires_title(client):
    response = client.post("/api/tasks", json={"description": "missing title"})
    assert response.status_code == 400

def test_update_task(client):
    created = client.post("/api/tasks", json={"title": "Old title"})
    task_id = created.json["id"]
    response = client.patch(f"/api/tasks/{task_id}", json={"status": "done", "title": "New title"})
    assert response.status_code == 200
    assert response.json["title"] == "New title"
    assert response.json["status"] == "done"

def test_invalid_status_rejected(client):
    created = client.post("/api/tasks", json={"title": "Test"})
    response = client.patch(f"/api/tasks/{created.json['id']}", json={"status": "finished"})
    assert response.status_code == 400

def test_delete_task(client):
    created = client.post("/api/tasks", json={"title": "Delete me"})
    task_id = created.json["id"]
    response = client.delete(f"/api/tasks/{task_id}")
    assert response.status_code == 204
    assert client.get(f"/api/tasks/{task_id}").status_code == 404


def test_homepage_serves_study_matrix(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json["service"] == "taskflow-api"


def test_production_frontend_is_served_from_the_api_image(tmp_path):
    from app.main import create_app

    (tmp_path / "index.html").write_text("<main>TaskFlow app</main>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("export {};")
    frontend = create_app({
        "TESTING": True,
        "AUTH_DISABLED": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SECRET_KEY": "test-secret",
        "FRONTEND_DIST_DIR": str(tmp_path),
    }).test_client()

    assert b"TaskFlow app" in frontend.get("/").data
    assert b"TaskFlow app" in frontend.get("/login").data
    assert frontend.get("/assets/app.js").status_code == 200
    assert frontend.get("/assets/missing.js").status_code == 404


def test_production_requires_a_built_frontend():
    from app.main import create_app

    with pytest.raises(RuntimeError, match="production frontend build"):
        create_app({
            "TESTING": True,
            "AUTH_DISABLED": False,
            "APP_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "postgresql+psycopg://user:pass@db/taskflow",
            "SECRET_KEY": "test-secret-with-at-least-thirty-two-characters",
            "STUDY_APP_PASSWORD": "test-password-is-long-enough",
            "FRONTEND_DIST_DIR": "/nonexistent/taskflow-frontend",
        })


@pytest.mark.parametrize(
    ("config", "missing_setting"),
    [
        (
            {
                "APP_ENV": "production",
                "STUDY_APP_PASSWORD": "test-password-is-long-enough",
                "SQLALCHEMY_DATABASE_URI": "postgresql+psycopg://user:pass@db/taskflow",
            },
            "SECRET_KEY",
        ),
        (
            {
                "APP_ENV": "production",
                "SECRET_KEY": "test-secret-with-at-least-thirty-two-characters",
                "SQLALCHEMY_DATABASE_URI": "postgresql+psycopg://user:pass@db/taskflow",
            },
            "STUDY_APP_PASSWORD",
        ),
        (
            {
                "APP_ENV": "production",
                "SECRET_KEY": "test-secret-with-at-least-thirty-two-characters",
                "STUDY_APP_PASSWORD": "test-password-is-long-enough",
                "SQLALCHEMY_DATABASE_URI": "sqlite:///taskflow.db",
            },
            "DATABASE_URL",
        ),
    ],
)
def test_production_fails_closed_when_required_configuration_is_invalid(
    config, missing_setting
):
    from app.main import create_app

    with pytest.raises(RuntimeError, match=missing_setting):
        create_app({"TESTING": True, **config})


def test_production_refuses_disabled_authentication():
    from app.main import create_app

    with pytest.raises(RuntimeError, match="AUTH_DISABLED"):
        create_app({
            "TESTING": True,
            "APP_ENV": "production",
            "AUTH_DISABLED": True,
            "SECRET_KEY": "test-secret-with-at-least-thirty-two-characters",
            "STUDY_APP_PASSWORD": "test-password-is-long-enough",
            "SQLALCHEMY_DATABASE_URI": "postgresql+psycopg://user:pass@db/taskflow",
        })


def test_postgresql_schema_creation_takes_a_transaction_advisory_lock():
    from contextlib import contextmanager
    from types import SimpleNamespace

    from app.main import _create_schema

    calls = []

    class FakeConnection:
        def execute(self, statement, parameters):
            assert "pg_advisory_xact_lock" in str(statement)
            assert parameters == {"namespace": 1414746951, "lock_id": 1}
            calls.append("lock")

    connection = FakeConnection()

    class FakeEngine:
        dialect = SimpleNamespace(name="postgresql")

        @contextmanager
        def begin(self):
            calls.append("begin")
            yield connection
            calls.append("commit")

    class FakeMetadata:
        def create_all(self, bind):
            assert bind is connection
            calls.append("create_all")

    _create_schema(FakeEngine(), FakeMetadata())

    assert calls == ["begin", "lock", "create_all", "commit"]


def test_internal_metrics_endpoint_remains_available(client):
    response = client.get("/api/metrics")

    assert response.status_code == 200
    assert b"taskflow_http_requests_total" in response.data


def test_study_state_starts_empty(client):
    response = client.get("/api/study/state")
    assert response.status_code == 200
    assert response.json["states"] == {}


def test_study_state_can_be_saved_and_loaded(client):
    with client.session_transaction() as session:
        session["csrf_token"] = "test-csrf"

    value = {
        "subjects": [{"id": "s0", "name": "Digital Electronics-I"}],
        "progress": {"0-1::study": True},
    }
    response = client.put(
        "/api/study/state/cst-study-data-v2",
        json={"value": value},
        headers={"X-CSRF-Token": "test-csrf"},
    )
    assert response.status_code == 200
    assert response.json["status"] == "saved"
    assert response.json["updated_at"]

    loaded = client.get("/api/study/state")
    assert loaded.status_code == 200
    assert loaded.json["states"]["cst-study-data-v2"] == value


def test_study_state_rejects_unknown_key(client):
    with client.session_transaction() as session:
        session["csrf_token"] = "test-csrf"
    response = client.put(
        "/api/study/state/unknown-key",
        json={"value": {}},
        headers={"X-CSRF-Token": "test-csrf"},
    )
    assert response.status_code == 404


def test_study_state_requires_csrf(client):
    response = client.put(
        "/api/study/state/cst-study-matrix-v1",
        json={"value": {}},
    )
    assert response.status_code == 403


def test_homepage_requires_login_when_auth_is_enabled():
    from app.main import create_app

    secured = create_app({
        "TESTING": True,
        "AUTH_DISABLED": False,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SECRET_KEY": "test-secret",
        "STUDY_APP_PASSWORD": "test-password",
    })
    client = secured.test_client()
    response = client.get("/")
    assert response.status_code == 302
    assert "/login" in response.headers["Location"]
    login_page = client.get("/login")
    assert login_page.status_code == 302
    assert login_page.headers["Location"] == "/#login"
    legacy_page = client.get("/legacy")
    assert legacy_page.status_code == 302
    assert "/login" in legacy_page.headers["Location"]
    assert client.get("/api/auth/csrf").status_code == 200


def test_legacy_page_is_available_only_to_authenticated_users():
    from app.main import create_app

    secured = create_app({
        "TESTING": True,
        "AUTH_DISABLED": False,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SECRET_KEY": "test-secret",
        "STUDY_APP_PASSWORD": "test-password",
    })
    client = secured.test_client()
    with client.session_transaction() as user_session:
        user_session["authenticated"] = True

    response = client.get("/legacy")

    assert response.status_code == 200
    assert b'id="adminView"' in response.data


def test_login_unlocks_study_api_and_csrf_is_enforced():
    from app.main import create_app

    secured = create_app({
        "TESTING": True,
        "AUTH_DISABLED": False,
        "APP_ENV": "development",
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SECRET_KEY": "test-secret",
        "STUDY_APP_PASSWORD": "correct-horse",
    })
    client = secured.test_client()

    assert client.get("/api/study/state").status_code == 401
    assert client.get("/api/csrf").status_code == 401
    csrf_response = client.get("/api/auth/csrf")
    assert csrf_response.status_code == 200
    csrf = csrf_response.json["csrf_token"]

    missing_csrf = client.post(
        "/api/auth/login",
        json={"password": "correct-horse"},
    )
    assert missing_csrf.status_code == 400

    invalid_password = client.post(
        "/api/auth/login",
        json={"password": "incorrect"},
        headers={"X-CSRF-Token": csrf},
    )
    assert invalid_password.status_code == 401

    response = client.post(
        "/api/auth/login",
        json={"password": "correct-horse"},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    assert client.get("/api/study/state").status_code == 200

    csrf_response = client.get("/api/csrf")
    assert csrf_response.status_code == 200
    csrf = csrf_response.json["csrf_token"]
    saved = client.put(
        "/api/study/state/cst-study-matrix-v1",
        json={"value": {"chapter::task": True}},
        headers={"X-CSRF-Token": csrf},
    )
    assert saved.status_code == 200

    rejected = client.put(
        "/api/study/state/cst-study-matrix-v1",
        json={"value": {"chapter::task": False}},
    )
    assert rejected.status_code == 403

    logout_rejected = client.post("/api/auth/logout")
    assert logout_rejected.status_code == 403
    logout = client.post(
        "/api/auth/logout",
        headers={"X-CSRF-Token": csrf},
    )
    assert logout.status_code == 200
    assert client.get("/api/study/state").status_code == 401
