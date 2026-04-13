import logging
import sys

def setup_logger(name: str = "graphlux", level: int = logging.INFO) -> logging.Logger:
    """Sets up a logger with a standard format."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(level)
    return logger

# Create a default logger instance
logger = setup_logger()
