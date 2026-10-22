import hmac
import json
import secrets

from flask import Blueprint, current_app, jsonify, request, session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .extensions import db
from .models import StudyState, Task

api = Blueprint("api", __name__)
VALID_STATUSES = {"todo", "in_progress", "done"}
STUDY_STATE_KEYS = {
    "cst-study-data-v2",
    "cst-study-matrix-v1",
    "cst-hub-v1",
    "cst-fx-v1",
}
MAX_STUDY_STATE_BYTES = 4 * 1024 * 1024


def _csrf_valid():
    expected = session.get("csrf_token", "")
    supplied = request.headers.get("X-CSRF-Token", "")
    return bool(expected and supplied and hmac.compare_digest(expected, supplied))



@api.get("/api/csrf")
def get_csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return jsonify({"csrf_token": token})


@api.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "cst-study-matrix-api"}), 200


@api.get("/api/ready")
def ready():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ready", "database": "ok"}), 200
    except SQLAlchemyError as error:
        db.session.rollback()
        current_app.logger.error(
            "Database readiness check failed (%s)", type(error).__name__
        )
        return jsonify({"status": "not_ready", "database": "unavailable"}), 503


@api.get("/api/study/state")
def get_study_state():
    rows = StudyState.query.all()
    return jsonify({
        "states": {row.key: row.payload for row in rows},
        "updated_at": {
            row.key: row.updated_at.isoformat() if row.updated_at else None
            for row in rows
        },
    })


@api.put("/api/study/state/<string:key>")
def put_study_state(key):
    if key not in STUDY_STATE_KEYS:
        return jsonify({"error": "unknown study state key"}), 404
    if not _csrf_valid():
        return jsonify({"error": "CSRF validation failed; reload the page"}), 403

    body = request.get_json(silent=True)
    if not isinstance(body, dict) or "value" not in body:
        return jsonify({"error": "JSON object with a value field is required"}), 400

    try:
        encoded = json.dumps(body["value"], ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    except (TypeError, ValueError):
        return jsonify({"error": "value must be valid JSON data"}), 400
    if len(encoded.encode("utf-8")) > MAX_STUDY_STATE_BYTES:
        return jsonify({"error": "study state is too large"}), 413

    row = db.session.get(StudyState, key)
    if row is None:
        row = StudyState(key=key, payload=body["value"])
        db.session.add(row)
    else:
        row.payload = body["value"]

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to persist study state key %s", key)
        return jsonify({"error": "could not save study state"}), 500

    return jsonify({
        "status": "saved",
        "key": key,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }), 200


@api.delete("/api/study/state/<string:key>")
def delete_study_state(key):
    if key not in STUDY_STATE_KEYS:
        return jsonify({"error": "unknown study state key"}), 404
    if not _csrf_valid():
        return jsonify({"error": "CSRF validation failed; reload the page"}), 403
    row = db.session.get(StudyState, key)
    if row is not None:
        db.session.delete(row)
        db.session.commit()
    return "", 204


# Legacy TaskFlow endpoints are retained for rollback and existing API tests.
@api.get("/api/tasks")
def list_tasks():
    tasks = Task.query.order_by(Task.id.asc()).all()
    return jsonify([task.to_dict() for task in tasks])


@api.post("/api/tasks")
def create_task():
    payload = request.get_json(silent=True) or {}
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "title is required and must be a non-empty string"}), 400
    description = payload.get("description", "")
    if not isinstance(description, str):
        return jsonify({"error": "description must be a string"}), 400
    task = Task(title=title.strip(), description=description.strip())
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@api.get("/api/tasks/<int:task_id>")
def get_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return jsonify({"error": "task not found"}), 404
    return jsonify(task.to_dict())


@api.patch("/api/tasks/<int:task_id>")
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return jsonify({"error": "task not found"}), 404
    payload = request.get_json(silent=True) or {}
    if "title" in payload:
        if not isinstance(payload["title"], str) or not payload["title"].strip():
            return jsonify({"error": "title must be a non-empty string"}), 400
        task.title = payload["title"].strip()
    if "description" in payload:
        if not isinstance(payload["description"], str):
            return jsonify({"error": "description must be a string"}), 400
        task.description = payload["description"].strip()
    if "status" in payload:
        if payload["status"] not in VALID_STATUSES:
            return jsonify({"error": "status must be todo, in_progress, or done"}), 400
        task.status = payload["status"]
    db.session.commit()
    return jsonify(task.to_dict())


@api.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return jsonify({"error": "task not found"}), 404
    db.session.delete(task)
    db.session.commit()
    return "", 204


@api.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "route not found"}), 404
