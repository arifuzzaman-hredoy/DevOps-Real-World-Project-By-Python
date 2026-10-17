from flask import Blueprint, jsonify, request
from sqlalchemy import text
from .extensions import db
from .models import Task

api = Blueprint("api", __name__)
VALID_STATUSES = {"todo", "in_progress", "done"}

@api.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "taskflow-api"}), 200

@api.get("/api/ready")
def ready():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ready", "database": "ok"}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"status": "not_ready", "database": "unavailable"}), 503

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
