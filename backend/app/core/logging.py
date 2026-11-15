"""
GateWise — Centralized Logging Configuration.
"""

import logging
import sys
from app.core.config import settings


def setup_logging():
    """Configure structured logging for GateWise."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    logger = logging.getLogger("gatewise")
    logger.setLevel(log_level)
    return logger


logger = setup_logging()
