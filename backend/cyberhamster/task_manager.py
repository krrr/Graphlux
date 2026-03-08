import os
import time
import asyncio
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from sqlmodel import Session, select
from typing import Dict, Any, Optional

from .db import engine
from .models import Task, DAGDefinition
from .engine.executor import DAGExecutor
from .logger import logger

class TaskEventHandler(FileSystemEventHandler):
    def __init__(self, task_id: int):
        self.task_id = task_id
        # Simple debounce to prevent multiple triggers for the same file rapidly
        self.recently_processed: Dict[str, float] = {}

    def _handle_event(self, file_path: str):
        # Ignore directories and hidden files
        if os.path.isdir(file_path) or os.path.basename(file_path).startswith('.'):
            return

        now = time.time()
        # Debounce: 5 seconds
        if file_path in self.recently_processed and now - self.recently_processed[file_path] < 5:
            return

        self.recently_processed[file_path] = now

        logger.info(f"Task {self.task_id} detected change for: {file_path}")

        # We need to run the executor in an asyncio event loop context or a new thread
        # Because watchdog handlers run in their own thread, we'll use a thread/async approach
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        # Get DAG definition for this task
        with Session(engine) as session:
            task = session.get(Task, self.task_id)
            if not task or task.status != "active":
                return
            dag_obj = session.get(DAGDefinition, task.dag_id)
            if not dag_obj:
                logger.error(f"DAG {task.dag_id} not found for task {self.task_id}")
                return
            dag_json = dag_obj.json_data

        executor = DAGExecutor(dag_json)

        # Fire and forget execution to avoid blocking watchdog thread
        def run_executor():
            try:
                executor.execute(file_path)
            except Exception as e:
                logger.error(f"Executor failed for {file_path}: {e}")

        # In a real app we might use a task queue (e.g. Celery), but threading is okay for this demo
        import threading
        threading.Thread(target=run_executor, daemon=True).start()

    def on_created(self, event):
        self._handle_event(event.src_path)

    def on_modified(self, event):
        self._handle_event(event.src_path)

class TaskManager:
    def __init__(self):
        self.observer = Observer()
        self.active_watches = {} # task_id -> Watch
        self._is_running = False

    def start(self):
        if self._is_running:
            return

        logger.info("Starting TaskManager...")
        self.observer.start()
        self._is_running = True
        self._sync_tasks()

    def stop(self):
        if not self._is_running:
            return

        logger.info("Stopping TaskManager...")
        self.observer.stop()
        self.observer.join()
        self._is_running = False

    def _sync_tasks(self):
        """Loads active tasks from DB and sets up watches."""
        with Session(engine) as session:
            tasks = session.exec(select(Task)).all()
            for task in tasks:
                if task.status == "active":
                    self.add_task(task)

    def add_task(self, task: Task):
        if not self._is_running or task.status != "active":
            return

        if task.id in self.active_watches:
            self.remove_task(task)

        if not task.watch_folder or not os.path.exists(task.watch_folder):
            logger.warning(f"Task {task.id}: Watch folder '{task.watch_folder}' does not exist.")
            return

        logger.info(f"Setting up watch for Task {task.id} on folder: {task.watch_folder}")
        handler = TaskEventHandler(task.id)
        watch = self.observer.schedule(handler, task.watch_folder, recursive=False)
        self.active_watches[task.id] = watch

        # Scan folder for existing files on startup/addition
        self._scan_folder(task, handler)

    def update_task(self, task: Task, old_folder: str):
        if task.id in self.active_watches:
             self.remove_task(task)
        if task.status == "active":
             self.add_task(task)

    def remove_task(self, task: Task):
        if task.id in self.active_watches:
            logger.info(f"Removing watch for Task {task.id}")
            watch = self.active_watches.pop(task.id)
            self.observer.unschedule(watch)

    def _scan_folder(self, task: Task, handler: TaskEventHandler):
        """Scans the watch folder for existing files and queues them for processing."""
        if not os.path.exists(task.watch_folder):
            return

        logger.info(f"Scanning existing files for Task {task.id} in {task.watch_folder}")
        for filename in os.listdir(task.watch_folder):
            filepath = os.path.join(task.watch_folder, filename)
            if os.path.isfile(filepath) and not filename.startswith('.'):
                handler._handle_event(filepath)

# Global singleton
task_manager = TaskManager()
