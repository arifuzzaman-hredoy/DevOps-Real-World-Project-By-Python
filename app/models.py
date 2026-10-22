from datetime import datetime, timezone

from .extensions import db


class Task(db.Model):
    """Legacy TaskFlow model retained temporarily for safe rollback compatibility."""

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.String(2000), nullable=False, default="")
    status = db.Column(db.String(20), nullable=False, default="todo")
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class StudyState(db.Model):
    """JSON state documents used by the existing CST Study Matrix UI."""

    __tablename__ = "study_states"

    key = db.Column(db.String(64), primary_key=True)
    payload = db.Column(db.JSON, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.payload,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
