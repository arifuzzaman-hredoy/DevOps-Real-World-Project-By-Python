import secrets
import hmac
from pathlib import Path

from flask import (
    Flask, abort, jsonify, redirect, render_template, request, send_from_directory,
    session,
)
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

from .config import Config
from .extensions import db
from .models import StudyState
from .routes import api
from .metrics import install_metrics


def _new_csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def _production_configuration_errors(config):
    if config.get("APP_ENV") != "production":
        return []

    errors = []
    secret = config.get("SECRET_KEY")
    if (
        not isinstance(secret, str)
        or not secret.strip()
        or len(secret) < 32
        or secret == "dev-only-change-me"
        or secret.startswith("replace-with")
    ):
        errors.append("SECRET_KEY")

    password = config.get("STUDY_APP_PASSWORD")
    if (
        not isinstance(password, str)
        or not password.strip()
        or len(password) < 16
        or password.startswith(("replace-with", "local-dev", "change-this"))
    ):
        errors.append("STUDY_APP_PASSWORD")

    database_url = config.get("SQLALCHEMY_DATABASE_URI") or ""
    try:
        parsed_database_url = make_url(database_url)
    except (ArgumentError, TypeError):
        parsed_database_url = None
    if (
        parsed_database_url is None
        or not parsed_database_url.drivername.startswith("postgresql")
        or not parsed_database_url.host
        or not parsed_database_url.database
        or not parsed_database_url.username
        or not parsed_database_url.password
    ):
        errors.append("DATABASE_URL")
    if config.get("AUTH_DISABLED", False):
        errors.append("AUTH_DISABLED")
    return errors


def _create_schema(engine, metadata):
    if engine.dialect.name != "postgresql":
        metadata.create_all(bind=engine)
        return

    with engine.begin() as connection:
        connection.execute(
            text("SELECT pg_advisory_xact_lock(:namespace, :lock_id)"),
            {"namespace": 1414746951, "lock_id": 1},
        )
        metadata.create_all(bind=connection)


def create_app(test_config=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    configuration_errors = _production_configuration_errors(app.config)
    if configuration_errors:
        required = ", ".join(configuration_errors)
        raise RuntimeError(
            f"Invalid production configuration; check: {required}."
        )

    if app.config.get("APP_ENV") == "production":
        app.config.update(
            SESSION_COOKIE_SECURE=True,
            SESSION_COOKIE_HTTPONLY=True,
            SESSION_COOKIE_SAMESITE="Lax",
        )

    frontend_dist = app.config.get("FRONTEND_DIST_DIR")
    frontend_available = bool(frontend_dist and Path(frontend_dist).is_dir())
    if app.config.get("APP_ENV") == "production" and not frontend_available:
        raise RuntimeError("The production frontend build is missing.")

    db.init_app(app)
    app.register_blueprint(api)
    install_metrics(app)

    @app.before_request
    def require_login():
        if app.config.get("AUTH_DISABLED", False):
            return None
        public_endpoints = {
            "api_login_csrf", "api_login", "login", "api.health", "api.ready",
            "metrics", "frontend_asset",
        }
        if request.endpoint in public_endpoints:
            return None
        if session.get("authenticated") is True:
            return None
        if request.path.startswith("/api/"):
            return jsonify({"error": "authentication required"}), 401
        return redirect(f"/login?next={request.path}")

    @app.get("/login")
    def login():
        if frontend_available:
            return send_from_directory(frontend_dist, "index.html")
        return redirect("/#login")

    @app.get("/<path:asset_path>")
    def frontend_asset(asset_path):
        if not frontend_available:
            abort(404)
        return send_from_directory(frontend_dist, asset_path)

    @app.get("/legacy")
    def legacy():
        remote_state = {
            row.key: row.payload for row in StudyState.query.all()
        }
        return render_template(
            "index.html",
            csrf_token=_new_csrf_token(),
            remote_state=remote_state,
        )

    @app.get("/api/auth/csrf")
    def api_login_csrf():
        return jsonify({"csrf_token": _new_csrf_token()})

    @app.post("/api/auth/login")
    def api_login():
        expected = session.get("csrf_token", "")
        supplied = request.headers.get("X-CSRF-Token", "")
        if not expected or not supplied or not hmac.compare_digest(expected, supplied):
            return jsonify({
                "error": "Your session expired. Reload the login page and try again."
            }), 400

        payload = request.get_json(silent=True)
        password = payload.get("password") if isinstance(payload, dict) else None
        if not isinstance(password, str):
            return jsonify({"error": "A password is required."}), 400
        if not hmac.compare_digest(password, app.config["STUDY_APP_PASSWORD"]):
            return jsonify({"error": "Incorrect password."}), 401

        session.clear()
        session["authenticated"] = True
        session["csrf_token"] = secrets.token_urlsafe(32)
        session.permanent = True
        return jsonify({"status": "authenticated"})

    @app.post("/api/auth/logout")
    def api_logout():
        expected = session.get("csrf_token", "")
        supplied = request.headers.get("X-CSRF-Token", "")
        if not expected or not supplied or not hmac.compare_digest(expected, supplied):
            return jsonify({"error": "CSRF validation failed."}), 403
        session.clear()
        return jsonify({"status": "logged_out"})

    @app.post("/logout")
    def logout():
        expected = session.get("csrf_token", "")
        supplied = request.form.get("csrf_token", "")
        if not expected or not supplied or not hmac.compare_digest(expected, supplied):
            abort(403)
        session.clear()
        return redirect("/login")

    @app.get("/")
    def index():
        if frontend_available:
            return send_from_directory(frontend_dist, "index.html")
        return jsonify({"service": "taskflow-api", "frontend": "/"})

    with app.app_context():
        _create_schema(db.engine, db.metadata)

    return app


app = create_app()
