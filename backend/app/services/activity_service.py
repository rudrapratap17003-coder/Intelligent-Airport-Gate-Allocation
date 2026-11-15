"""
GateWise — Activity Logging Service.
Records real operational events and mutations across the database layer.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.entities import ActivityLog


def log_activity(
    db: Session,
    action_type: str,
    entity_type: str,
    entity_id: Optional[str],
    title: str,
    detail: str,
    status: str = "info"
) -> ActivityLog:
    """Record an operational activity in the persistent database."""
    entry = ActivityLog(
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        title=title,
        detail=detail,
        status=status,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(entry)
    return entry
