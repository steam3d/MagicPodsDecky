import logging
import os
import stat
import subprocess
import threading
import time

_logger = logging.getLogger("magicpods")
logger = logging.LoggerAdapter(_logger, {"tag": "py"})


class ExtCoreService:
    def __init__(self, x_dir, x_name, on_string_received=None):
        self.x_name = x_name
        self.x_path = os.path.join(x_dir, x_name)
        self.onStringReceived = on_string_received

        self.process = None
        self.reader_thread = None
        self.pid = None
        self.owns_backend = False

        env = os.environ.copy()
        env.pop("LD_LIBRARY_PATH", None)
        env.pop("LD_PRELOAD", None)
        env["XDG_RUNTIME_DIR"] = "/run/user/1000"
        self.env = env

    def _owned_running(self):
        return self.process is not None and self.process.poll() is None

    def _is_process_alive(self, pid):
        if pid is None or pid <= 0:
            return False

        try:
            os.kill(pid, 0)
            return True
        except ProcessLookupError:
            return False
        except PermissionError:
            return True
        except OSError:
            return False

    def _sync_state(self):
        if self._owned_running():
            self.pid = self.process.pid
            self.owns_backend = True
            return

        if self.owns_backend:
            logger.info("Owned backend is no longer running")

        self.process = None
        self.reader_thread = None
        self.owns_backend = False

    def _find_running_backend_pid(self):
        try:
            result = subprocess.run(
                ["pgrep", "-x", self.x_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                env=self.env,
                timeout=2,
                check=False,
            )
        except FileNotFoundError:
            logger.error("pgrep not found, unable to detect an existing backend")
            return None
        except subprocess.TimeoutExpired:
            logger.warning("Timed out while checking for an existing backend")
            return None

        for line in result.stdout.splitlines():
            try:
                pid = int(line.strip())
            except ValueError:
                continue

            if self._is_process_alive(pid):
                return pid

        return None

    def _ensure_executable(self):
        if not os.path.exists(self.x_path):
            logger.error("The file does not exist: %s", self.x_path)
            return False

        if os.access(self.x_path, os.X_OK):
            return True

        try:
            mode = os.stat(self.x_path).st_mode
            os.chmod(self.x_path, mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            logger.info("Set chmod +x to %s", self.x_path)
            return True
        except OSError:
            logger.exception("Failed to make backend executable: %s", self.x_path)
            return False

    def _start_reader(self):
        if not self._owned_running() or self.process.stdout is None:
            return

        if self.reader_thread is not None and self.reader_thread.is_alive():
            return

        self.reader_thread = threading.Thread(target=self.reader, args=(self.process,), daemon=True)
        self.reader_thread.start()

    def is_running(self):
        self._sync_state()

        if self._owned_running():
            return True

        self.pid = self._find_running_backend_pid()
        return self.pid is not None

    def start(self):
        self._sync_state()

        if self._owned_running():
            logger.info("Backend already running (owned pid %s)", self.pid)
            return True

        # Shared backend is not monitored here in the background.
        # If it dies, we detect that on websocket reconnect and re-check again.
        shared_pid = self._find_running_backend_pid()
        if shared_pid is not None:
            self.pid = shared_pid
            self.owns_backend = False
            logger.info("Backend already running externally (pid %s). Attach only.", shared_pid)
            return True

        if not self._ensure_executable():
            return False

        logger.info("Starting backend: %s", self.x_path)

        try:
            self.process = subprocess.Popen(
                [self.x_path],
                shell=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=self.env,
            )
        except OSError:
            logger.exception("Failed to start backend: %s", self.x_path)
            self.process = None
            self.pid = None
            self.owns_backend = False
            return False

        self.pid = self.process.pid
        self.owns_backend = True
        self._start_reader()
        logger.info("Started backend successfully (pid %s)", self.pid)
        return True

    def stop(self):
        self._sync_state()

        if not self._owned_running():
            logger.info("Stop: backend is shared or not running, skipping")
            return False

        logger.info("Stop: stopping owned backend (pid %s)", self.pid)
        self.process.terminate()

        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=1)

        if self.reader_thread is not None and self.reader_thread.is_alive():
            self.reader_thread.join(timeout=2)

        self.process = None
        self.reader_thread = None
        self.pid = None
        self.owns_backend = False
        return True

    def restart(self):
        logger.info("Backend restarting")

        if self.stop():
            time.sleep(0.5)
        else:
            logger.info("Restart: backend is shared or not running, not stopping it")

        return self.start()

    def reader(self, process):
        if process.stdout is None:
            return

        try:
            for line in iter(process.stdout.readline, b""):
                if not line:
                    break

                text = line.decode("utf-8", errors="replace").rstrip()
                if self.onStringReceived is not None:
                    self.onStringReceived(text)
        finally:
            process.stdout.close()
