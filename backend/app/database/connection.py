"""
GateWise — Database connection and session management.
"""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# Ensure sqlite directory exists if using file-based sqlite
if settings.DATABASE_URL.startswith("sqlite:///"):
    sqlite_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if sqlite_path and sqlite_path != ":memory:":
        Path(sqlite_path).resolve().parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all models."""
    pass


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all database tables and seed benchmark sample datasets."""
    # Import all models so metadata is complete
    import app.models.entities  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Seed baseline benchmark datasets
    from app.database.seed import seed_database
    with SessionLocal() as db:
        seed_database(db)
