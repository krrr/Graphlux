import subprocess
import threading
import queue
import time
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from ..logger import logger

from sqlmodel import Session
from ..db import engine
from ..models import SystemSettings

# A thread pool only for pipe readers
_magick_executor = ThreadPoolExecutor(max_workers=64, thread_name_prefix="Magick")

class MagickProcess:
    def __init__(self, executable_path: str):
        self.executable_path = executable_path
        self.process = subprocess.Popen(
            [executable_path, "-script", "-"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1  # line buffered
        )
        self.result_queue = queue.Queue()
        self.is_dead = False
        self.last_used_time = time.time()
        
        # Submit reader tasks to the thread pool
        _magick_executor.submit(self._read_stdout)
        _magick_executor.submit(self._read_stderr)
        
        # Thread lock for execution to prevent overlapping if misused. Just in case
        self.lock = threading.Lock()

    def _read_stdout(self):
        try:
            for line in self.process.stdout:
                line = line.strip()
                if line.startswith("DONE_"):
                    self.result_queue.put(line)
        except Exception as e:
            self.is_dead = True
            logger.error(f"MagickProcess stdout reader error: {e}")

    def _read_stderr(self):
        try:
            for line in self.process.stderr:
                line = line.strip()
                if line:
                    logger.warning(f"ImageMagick stderr: {line}")
        except Exception as e:
            self.is_dead = True
            logger.error(f"MagickProcess stderr reader error: {e}")

    def execute(self, script_command: str, timeout: int = 60) -> bool:
        if self.is_dead or self.process.poll() is not None:
            self.is_dead = True
            return False

        with self.lock:
            self.last_used_time = time.time()
            task_id = str(uuid.uuid4()).replace("-", "")
            sentinel = f"DONE_{task_id}"
            
            # Clear previous results just in case
            while not self.result_queue.empty():
                try:
                    self.result_queue.get_nowait()
                except queue.Empty:
                    break

            # -print prints to stdout, followed by a newline.
            # We wrap the command to isolate state and ensure cleanup.
            full_command = f"{script_command} -print \"{sentinel}\\n\"\n"
            
            try:
                self.process.stdin.write(full_command)
                self.process.stdin.flush()
            except Exception as e:
                logger.error(f"Failed to write to ImageMagick stdin: {e}")
                self.is_dead = True
                return False

            # Wait for sentinel
            start_time = time.time()
            while True:
                # First check if process died (e.g., fatal error encountered)
                if self.process.poll() is not None:
                    self.is_dead = True
                    logger.error(f"ImageMagick process died unexpectedly during execution.")
                    return False

                try:
                    # Wait with small timeout to frequently check poll status and overall timeout
                    result = self.result_queue.get(timeout=0.1)
                    if result == sentinel:
                        return True
                    else:
                        logger.warning(f"Unexpected ImageMagick stdout sentinel: {result}")
                except queue.Empty:
                    if time.time() - start_time > timeout:
                        logger.error(f"ImageMagick command timed out after {timeout}s: {script_command}")
                        self.is_dead = True
                        self.terminate()
                        return False

    def terminate(self):
        self.is_dead = True
        if self.process.poll() is None:
            try:
                self.process.terminate()
                self.process.wait(timeout=2)
            except Exception:
                try:
                    self.process.kill()
                except:
                    pass

class MagickPool:
    def __init__(self, max_size: int = 4, idle_timeout: int = 300):
        self.max_size = max_size # This is now a default/fallback
        self.idle_timeout = idle_timeout
        self.pool: queue.Queue = queue.Queue()
        self.active_count = 0
        self.lock = threading.Lock()

    def _get_settings(self) -> SystemSettings:
        # Load from DB to support dynamic changes
        try:
            with Session(engine) as session:
                settings = session.get(SystemSettings, 1)
                if settings:
                    return settings
        except Exception as e:
            logger.warning(f"Could not load settings from DB: {e}")
        return SystemSettings(id=1, imagemagick_path="magick", max_concurrent_tasks=4)

    def _create_process(self, path: str) -> Optional[MagickProcess]:
        try:
            proc = MagickProcess(executable_path=path)
            return proc
        except Exception as e:
            logger.error(f"Failed to create MagickProcess: {e}")
            return None

    def acquire(self) -> Optional[MagickProcess]:
        settings = self._get_settings()
        while True:
            try:
                proc: MagickProcess = self.pool.get_nowait()
                if proc.is_dead or proc.process.poll() is not None:
                    # Clean up dead process
                    with self.lock:
                        self.active_count -= 1
                    continue
                
                # Check for executable change
                if proc.executable_path != settings.imagemagick_path:
                    proc.terminate()
                    with self.lock:
                        self.active_count -= 1
                    continue
                    
                return proc
            except queue.Empty:
                with self.lock:
                    if self.active_count < settings.max_concurrent_tasks:
                        self.active_count += 1
                        proc = self._create_process(settings.imagemagick_path)
                        if proc:
                            return proc
                        else:
                            self.active_count -= 1
                            return None
                    else:
                        break # Block and wait if at max capacity

        # If we reached here, pool is empty and at max capacity. Wait.
        try:
            proc = self.pool.get(timeout=60) # Wait up to 60s for a process
            if proc.is_dead or proc.process.poll() is not None:
                 with self.lock:
                     self.active_count -= 1
                 return self.acquire() # Retry
            return proc
        except queue.Empty:
            logger.error("Timeout waiting for an available ImageMagick process from the pool.")
            return None

    def release(self, proc: MagickProcess):
        if proc.is_dead or proc.process.poll() is not None:
            proc.terminate()
            with self.lock:
                self.active_count -= 1
        else:
            self.pool.put(proc)

    def reap_idle(self):
        """
        Thread-safe method to terminate processes that have been idle for too long.
        """
        sz = self.pool.qsize()
        now = time.time()
        for _ in range(sz):
            try:
                proc: MagickProcess = self.pool.get_nowait()
                # Check if process is still alive and not timed out
                if proc.process.poll() is not None or proc.is_dead or (now - proc.last_used_time > self.idle_timeout):
                    proc.terminate()
                    with self.lock:
                        self.active_count -= 1
                else:
                    self.pool.put(proc)
            except queue.Empty:
                break


# Global pool instance
_magick_pool = MagickPool(max_size=4, idle_timeout=300)


class ImageMagickWrapper:
    @staticmethod
    def run(input_file: str, output_file: str, args: List[str]) -> bool:
        """
        Run ImageMagick (magick) with given arguments using a persistent process pool.

        :param input_file: Path to input file.
        :param output_file: Path to output file.
        :param args: List of magick arguments (e.g., ['-resize', '800x600', '-quality', '85']).
        :return: True if successful, False otherwise.
        """
        proc = _magick_pool.acquire()
        if not proc:
            return False

        try:
            quoted_input = _quote_path(input_file)
            quoted_output = _quote_path(output_file)
            # For arguments, escape any existing double quotes to avoid breaking the command
            quoted_args = " ".join(f'"{a.replace("\"", "\\\"")}"' for a in args)

            # Use parenthesis to create an image sequence, process it, write it, and discard it afterwards.
            # This isolates the state perfectly without bleeding into the next command.
            script_cmd = f"( -read {quoted_input} {quoted_args} -write {quoted_output} ) -delete 0--1"
            
            success = proc.execute(script_cmd, timeout=120)
            return success
        except Exception as e:
            logger.error(f"Error executing magick command on {input_file}: {e}")
            proc.is_dead = True
            return False
        finally:
            _magick_pool.release(proc)


async def magick_pool_reaper():
    """Background task to reap idle ImageMagick processes."""
    while True:
        await asyncio.sleep(60)
        # Use thread pool to run the synchronous reap_idle method to avoid blocking the event loop
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(_magick_executor, _magick_pool.reap_idle)
        except Exception as e:
            logger.error(f"Error in magick_pool_reaper: {e}")


def _quote_path(path: str) -> str:
    # Normalize Windows paths: convert backslashes to forward slashes
    # ImageMagick accepts forward slashes on all platforms
    ret = path.replace('\\', '/')
    # Use double quotes for paths with spaces or special characters
    # ImageMagick's -read directive accepts quoted paths
    if ' ' in ret or '"' in ret:
        ret = f'"{ret}"'
    return ret
