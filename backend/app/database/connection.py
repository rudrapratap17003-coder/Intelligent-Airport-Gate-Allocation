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


def upgrade_schema(db_engine):
    """Safely migrate SQLite database tables to include BLR digital twin columns if missing."""
    from sqlalchemy import text
    try:
        with db_engine.connect() as conn:
            # Check flights table
            result = conn.execute(text("PRAGMA table_info(flights)"))
            existing_flight_cols = {row[1] for row in result.fetchall()}
            if existing_flight_cols:
                flight_cols_to_add = [
                    ("origin", "VARCHAR(50) DEFAULT 'DEL'"),
                    ("destination", "VARCHAR(50) DEFAULT 'BLR'"),
                    ("flight_type", "VARCHAR(50) DEFAULT 'Domestic'"),
                    ("priority", "VARCHAR(50) DEFAULT 'Standard'"),
                    ("estimated_time", "VARCHAR(20) DEFAULT NULL"),
                    ("actual_time", "VARCHAR(20) DEFAULT NULL"),
                    ("turnaround_duration", "INTEGER DEFAULT 45"),
                    ("aircraft_registration", "VARCHAR(50) DEFAULT 'VT-BLR'"),
                    ("aircraft_category", "VARCHAR(50) DEFAULT 'Code C'"),
                    ("data_tier", "VARCHAR(50) DEFAULT 'SIMULATED_OPERATIONAL_DATA'"),
                ]
                for col_name, col_def in flight_cols_to_add:
                    if col_name not in existing_flight_cols:
                        conn.execute(text(f"ALTER TABLE flights ADD COLUMN {col_name} {col_def}"))

            # Check gates table
            result = conn.execute(text("PRAGMA table_info(gates)"))
            existing_gate_cols = {row[1] for row in result.fetchall()}
            if existing_gate_cols:
                gate_cols_to_add = [
                    ("stand_type", "VARCHAR(50) DEFAULT 'Contact Aerobridge'"),
                    ("has_jetway", "INTEGER DEFAULT 1"),
                    ("aircraft_category", "VARCHAR(50) DEFAULT 'Code C'"),
                    ("max_wingspan_m", "FLOAT DEFAULT 36.0"),
                    ("max_length_m", "FLOAT DEFAULT 45.0"),
                    ("is_remote", "INTEGER DEFAULT 0"),
                    ("data_tier", "VARCHAR(50) DEFAULT 'CONFIGURABLE_DEMONSTRATION_DATA'"),
                ]
                for col_name, col_def in gate_cols_to_add:
                    if col_name not in existing_gate_cols:
                        conn.execute(text(f"ALTER TABLE gates ADD COLUMN {col_name} {col_def}"))

            # Check restriction_matrices table for Phase 10 identity metadata
            result = conn.execute(text("PRAGMA table_info(restriction_matrices)"))
            existing_matrix_cols = {row[1] for row in result.fetchall()}
            if existing_matrix_cols:
                matrix_cols_to_add = [
                    ("row_flight_ids", "TEXT DEFAULT NULL"),
                    ("column_gate_ids", "TEXT DEFAULT NULL"),
                ]
                for col_name, col_def in matrix_cols_to_add:
                    if col_name not in existing_matrix_cols:
                        conn.execute(text(f"ALTER TABLE restriction_matrices ADD COLUMN {col_name} {col_def}"))

            conn.commit()
    except Exception as e:
        # Non-fatal if table doesn't exist yet before create_all
        pass


def init_db():
    """Create all database tables and seed benchmark sample datasets."""
    # Import all models so metadata is complete
    import app.models.entities  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Apply safe SQLite column additions for existing databases
    upgrade_schema(engine)

    # Seed baseline benchmark datasets
    from app.database.seed import seed_database
    with SessionLocal() as db:
        seed_database(db)
