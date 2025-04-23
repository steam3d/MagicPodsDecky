import subprocess
import threading
import logging

import os
import signal

#_logger = logging.getLogger()
_logger = logging.getLogger("magicpods")
logger = logging.LoggerAdapter(_logger, {'tag': 'py'})

class CoreBase():
    def __init__(self, x_dir, x_name):
        self.x_dir = x_dir
        self.x_name = x_name
        self.x_path = os.path.join(self.x_dir, self.x_name)

    def _set_x(self):
        path = os.path.join(self.x_dir, self.x_name)
        if os.access(path, os.X_OK) != True:        
            os.system("chmod +x {}".format(path))
            logger.info("set chomd +x to %s", path)
        else:
            logger.info("already chomd +x %s", path)

    def _start(self):
        logger.info("Backend started")   
    
    def _stop(self):
        logger.info("Backend stopped") 
    
    def start(self):
        if not os.path.exists(self.x_path):
            logger.error("The files does not exist: %s", self.x_path)
            return        
        self._set_x()
        self._start()

    def stop(self):
        self._stop()
    
    def restart(self):
        logger.info("Backend restarting")
        self.stop()
        self.start()


class CoreBackgroundService(CoreBase):
    def __init__(self, x_dir, x_name):
        super().__init__(x_dir, x_name)

    def _get_backend_pid(self):
        output = subprocess.Popen("ps -ef", stdout=subprocess.PIPE, shell=True).communicate()[0].decode('utf-8').splitlines()
        for line in output[1:]:
            fields = line.split()
            if self.x_name in fields[7]:
                return int(fields[1])
        return -1

    def _start(self):        
        if self._get_backend_pid() == -1:   
            os.system("'{}' &".format(self.x_path))
            logger.info("runnig %s", self.x_path)
            super()._start()        
        else:
            logger.info("already running. Skip start. %s", self.x_path) 

    def _stop(self):
        pid = self._get_backend_pid()
        if (pid != -1):
            os.kill(pid, signal.SIGTERM)
            logger.info("{} ({}) killed".format(self.x_name,pid))
            super()._stop()


class CoreService(CoreBase):    
    def __init__(self, x_dir, x_name, on_string_received = None):
        self.loglevel = 50
        self.task = None
        self.thread = None
        self.onStringReceived = on_string_received
        super().__init__(x_dir, x_name)


    def _is_runnig(self) -> bool:
        if self.thread == None:            
            return False
        
        if self.task == None:            
            return False
        
        if self.thread.is_alive() == False:            
            return False
        
        if self.task.poll() is not None:
            return False
                
        return True        
    

    def _start(self):        
        if not self._is_runnig():
            logger.info(self.x_path)
            self.task = subprocess.Popen([self.x_path, "-l", str(self.loglevel)], shell=False, stdout=subprocess.PIPE,stderr=subprocess.STDOUT)            
            self.thread = threading.Thread(target=self.reader, args=())
            self.thread.start()
            super()._start()          
        else:
            logger.info("Backend already running")


    def _stop(self):
        if self._is_runnig():
            self.task.terminate()
            os.kill(self.task.pid, signal.SIGKILL)
            self.thread.join()
            super()._stop()
        else:
            logger.info("Backend already stopped")

        self.thread = self.task = None


    def reader(self):
        for line in iter(self.task.stdout.readline, b''):         
            text = line.decode('utf-8').rstrip()        
            if self.onStringReceived is not None:
                self.onStringReceived(text)

