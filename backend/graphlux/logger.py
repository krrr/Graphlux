import logging
import sys
import queue
from collections import deque

import datetime

# Thread-safe queue to store logs for websocket broadcasting
log_queue = queue.Queue(maxsize=1000)
# Store the last 500 lines of logs for history retrieval
log_history = deque(maxlen=500)

class QueueHandler(logging.Handler):
    """Custom logging handler that puts structured log data into a queue and history buffer."""
    def emit(self, record):
        try:
            # Create a structured dictionary instead of a string
            log_data = {
                "time": datetime.datetime.fromtimestamp(record.created).isoformat(),
                "name": record.name,
                "level": record.levelname,
                "message": record.getMessage(),
            }
            log_queue.put_nowait(log_data)
            log_history.append(log_data)
        except queue.Full:
            pass 
        except Exception:
            self.handleError(record)



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
        
        # Add QueueHandler for websocket broadcasting
        q_handler = QueueHandler()
        q_handler.setFormatter(formatter)
        logger.addHandler(q_handler)
        
        logger.setLevel(level)
    return logger

# Create a default logger instance
logger = setup_logger()
