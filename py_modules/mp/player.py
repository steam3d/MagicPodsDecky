import subprocess
import logging
import threading
import os
import signal

_logger = logging.getLogger("magicpods")
logger = logging.LoggerAdapter(_logger, {'tag': 'py'})

class Player:    
    def __init__(self, f_path, on_string_received = None):
        self.task = None
        self.thread = None
        self.onStringReceived = on_string_received
        self.f_path = f_path

        # copy existing environ. Good point to check environ uses in decky 
        my_env = os.environ.copy()                
        my_env['XDG_RUNTIME_DIR'] = '/run/user/1000'        
        self.env = my_env 


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

    def start(self):        
        if not self._is_runnig():
            logger.info(self.f_path)
            self.task = subprocess.Popen("exec ffplay -loop 0 -nodisp -autoexit -loglevel quiet '{0}'".format(self.f_path), shell=True, stdout=subprocess.PIPE,stderr=subprocess.STDOUT, env=self.env)
            logger.info(self.task)   
            self.thread = threading.Thread(target=self.reader, args=())
            self.thread.start()
            logger.info("Player plying")       
        else:
            logger.info("Player already plying")


    def stop(self):
        if self._is_runnig():
            self.task.terminate()
            os.kill(self.task.pid, signal.SIGKILL)
            self.thread.join()
            logger.info("Player stopped")

        else:
            logger.info("Player already stopped")

        self.thread = self.task = None

    def reader(self):
        for line in iter(self.task.stdout.readline, b''):         
            text = line.decode('utf-8').rstrip()        
            if self.onStringReceived is not None:
                self.onStringReceived(text)