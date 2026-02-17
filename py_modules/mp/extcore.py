import subprocess
import threading
import logging
import os

_logger = logging.getLogger("magicpods")
logger = logging.LoggerAdapter(_logger, {'tag': 'py'})


class ExtCoreService():
    def __init__(self, s_name, on_string_received = None):
        self.service = s_name
        self.loglevel = 50
        self.task = None
        self.thread = None
        self.onStringReceived = on_string_received

        env = os.environ.copy()
        logger.error(env)
        env.pop("LD_LIBRARY_PATH", None)
        env.pop("LD_PRELOAD", None)
        env["XDG_RUNTIME_DIR"] = "/run/user/1000"
        #user = env.get("DECKY_USER", env.get("USER", "deck"))
        #env["USER"] = user
        #env["LOGNAME"] = user
        #env.setdefault("XDG_RUNTIME_DIR", "/run/user/1000")
        #env.setdefault("DBUS_SESSION_BUS_ADDRESS", "unix:path=/run/user/1000/bus")
        self.env = env

    def isActive(self):
        cmd = subprocess.Popen(["systemctl", "--user", "is-active", self.service], shell=False, stdout=subprocess.PIPE,stderr=subprocess.STDOUT, env=self.env)
        line = cmd.stdout.readline().decode('utf-8').strip()
        logger.error(line)
        return "active" in line

    def isExists(self):
        cmd = subprocess.Popen(["systemctl", "--user", "show", self.service, "--property=LoadState", "--value"], shell=False, stdout=subprocess.PIPE,stderr=subprocess.STDOUT, env=self.env)
        line = cmd.stdout.readline().decode('utf-8').strip()
        logger.error(line)
        return line != "not-found"


    def restart(self):
        subprocess.Popen(["systemctl", "--user", "restart", self.service], shell=False, stdout=subprocess.PIPE,stderr=subprocess.STDOUT, env=self.env)

    def start(self):
        subprocess.Popen(["systemctl", "--user", "start", self.service], shell=False, stdout=subprocess.PIPE,stderr=subprocess.STDOUT, env=self.env)

    def stop(self):
        subprocess.Popen(["systemctl", "--user", "stop", self.service], shell=False, stdout=subprocess.PIPE,stderr=subprocess.STDOUT, env=self.env)


    def startReader(self):
        if self.thread and self.thread.is_alive():
            return
        self.thread = threading.Thread(target=self.reader, daemon=True)
        self.thread.start()

    def stopReader(self):
        if self.task and self.task.poll() is None:
            self.task.terminate()
        if self.thread:
            self.thread.join(timeout=2)

    def reader(self):
        self.task = subprocess.Popen(["journalctl", "--user", "-u", self.service, "-f", "-n", "0", "--output=cat"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1, env=self.env)
        try:
            for line in self.task.stdout:
                self.onStringReceived(line.rstrip())
                #print(line.rstrip())
        finally:
            if self.task and self.task.poll() is None:
                self.task.terminate()
            self.task = None

