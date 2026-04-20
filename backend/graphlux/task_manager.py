import os
import time
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from sqlmodel import Session, select
from typing import Dict, Any, Optional

from .db import engine
from .models import Task, Folder, SystemSettings
from .engine.executor import TaskExecutor
from .logger import logger

class FolderEventHandler(FileSystemEventHandler):
    def __init__(self, folder_id: int, executor_pool: ThreadPoolExecutor):
        self.folder_id = folder_id
        self.executor_pool = executor_pool
        # Simple debounce to prevent multiple triggers for the same file rapidly
        self.recently_processed: Dict[str, float] = {}
        # Cache for tasks used by this folder (including sub-tasks)
        self.task_cache: Dict[int, Dict[str, Any]] = {}

    def _handle_event(self, file_path: str):
        # Ignore directories and hidden files
        if os.path.isdir(file_path) or os.path.basename(file_path).startswith('.'):
            return

        now = time.time()
        # Debounce: 5 seconds
        if file_path in self.recently_processed and now - self.recently_processed[file_path] < 5:
            return

        # Get Task definition for this folder
        with Session(engine) as session:
            folder = session.get(Folder, self.folder_id)
            if not folder or folder.status != "active":
                return

            # Check regex
            if folder.filename_regex:
                filename = os.path.basename(file_path)
                if not re.search(folder.filename_regex, filename):
                    return

            self.recently_processed[file_path] = now
            logger.info(f"Folder {self.folder_id} detected change for: {file_path}")

            tasks = folder.tasks
            if not tasks:
                logger.warning(f"No tasks found for folder {self.folder_id}")
                return
            
            task_jsons = [t.json_data for t in tasks]
            
            # Pre-populate cache recursively for all tasks in this folder
            for tj in task_jsons:
                TaskExecutor.preload_tasks_recursive(tj, self.task_cache, session=session)

        for i in task_jsons:
            executor = TaskExecutor(i, task_cache=self.task_cache)

            # Fire and forget execution to avoid blocking watchdog thread
            def run_executor(exec_obj, path):
                try:
                    exec_obj.execute_with_file(path)
                except Exception as e:
                    logger.error(f"Executor failed for {path}: {e}")

            # Use the thread pool to execute the task, respecting the max_workers limit
            self.executor_pool.submit(run_executor, executor, file_path)

    def on_created(self, event):
        self._handle_event(event.src_path)

    def on_modified(self, event):
        self._handle_event(event.src_path)

class TaskManager:
    def __init__(self):
        self.observer = Observer()
        self.active_watches = {} # folder_id -> Watch
        self.active_scans = {} # folder_id -> threading.Event (to stop)
        self._is_running = False
        self.executor_pool: Optional[ThreadPoolExecutor] = None

    def _get_max_concurrent_tasks(self) -> int:
        try:
            with Session(engine) as session:
                settings = session.get(SystemSettings, 1)
                if settings:
                    return settings.max_concurrent_tasks
        except Exception as e:
            logger.warning(f"Could not load max_concurrent_tasks from DB: {e}")
        return 4

    def start(self):
        if self._is_running:
            return

        logger.info("Starting TaskManager...")
        max_workers = self._get_max_concurrent_tasks()
        
        # Initialize pool with the latest settings
        self.executor_pool = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="Executor")

        self.observer.start()
        self._is_running = True
        self._sync_folders()

    def stop(self):
        if not self._is_running:
            return

        logger.info("Stopping TaskManager...")
        self.observer.stop()
        self.observer.join()

        for stop_event in self.active_scans.values():
            stop_event.set()

        if self.executor_pool:
            self.executor_pool.shutdown(wait=False)
            self.executor_pool = None
            
        self._is_running = False

    def _sync_folders(self):
        """Loads active folders from DB and sets up watches."""
        with Session(engine) as session:
            folders = session.exec(select(Folder)).all()
            for folder in folders:
                if folder.status == "active":
                    self.add_folder(folder)

    def add_folder(self, folder: Folder):
        if not self._is_running or folder.status != "active":
            return

        if folder.id in self.active_watches:
            self.remove_folder(folder)

        if not folder.watch_folder or not os.path.exists(folder.watch_folder):
            logger.warning(f"Folder {folder.id}: Watch folder '{folder.watch_folder}' does not exist.")
            return

        handler = FolderEventHandler(folder.id, self.executor_pool)

        if folder.real_time_watch:
            logger.info(f"Setting up real-time watch for Folder {folder.id} on path: {folder.watch_folder}")
            watch = self.observer.schedule(handler, folder.watch_folder, recursive=True)
            self.active_watches[folder.id] = watch

        # Set up periodic scan
        if folder.scan_interval > 0:
            stop_event = threading.Event()
            self.active_scans[folder.id] = stop_event
            threading.Thread(target=self._periodic_scan_loop, args=(folder.id, folder.scan_interval, stop_event), daemon=True).start()

        # Scan folder for existing files on startup/addition
        self._scan_folder(folder, handler)

    def update_folder(self, folder: Folder, old_folder_path: str):
        if folder.id in self.active_watches or folder.id in self.active_scans:
             self.remove_folder(folder)
        if folder.status == "active":
             self.add_folder(folder)

    def remove_folder(self, folder: Folder):
        if folder.id in self.active_watches:
            logger.info(f"Removing real-time watch for Folder {folder.id}")
            watch = self.active_watches.pop(folder.id)
            self.observer.unschedule(watch)

        if folder.id in self.active_scans:
            logger.info(f"Stopping periodic scan for Folder {folder.id}")
            self.active_scans[folder.id].set()
            self.active_scans.pop(folder.id)

    def _periodic_scan_loop(self, folder_id: int, interval: int, stop_event: threading.Event):
        logger.info(f"Starting periodic scan for Folder {folder_id} every {interval}s")
        while not stop_event.is_set():
            time.sleep(interval)
            if stop_event.is_set():
                break

            with Session(engine) as session:
                folder = session.get(Folder, folder_id)
                if folder and folder.status == "active":
                    handler = FolderEventHandler(folder.id, self.executor_pool)
                    self._scan_folder(folder, handler)

    def _scan_folder(self, folder: Folder, handler: FolderEventHandler):
        """Scans the watch folder recursively for existing files and queues them for processing."""
        if not os.path.exists(folder.watch_folder):
            return

        logger.info(f"Scanning files for Folder {folder.id} in {folder.watch_folder} (recursive)")
        for root, dirs, files in os.walk(folder.watch_folder):
            # Prune hidden directories in-place to prevent os.walk from entering them
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for filename in files:
                if filename.startswith('.'):
                    continue
                
                filepath = os.path.join(root, filename)
                if folder.filename_regex:
                    if not re.search(folder.filename_regex, filename):
                        continue
                handler._handle_event(filepath)

# Global singleton
task_manager = TaskManager()
