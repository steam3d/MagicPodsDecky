import subprocess
import logging
import re
import os

_logger = logging.getLogger("magicpods")
logger = logging.LoggerAdapter(_logger, {'tag': 'py'})

class Microphone():
    def __init__(self):
        # copy existing environ. Good point to check environ uses in decky 
        my_env = os.environ.copy()                
        my_env['XDG_RUNTIME_DIR'] = '/run/user/1000'        
        self.env = my_env 

    def Toggle(self):
        process = subprocess.Popen(['amixer set Capture toggle'], shell=True , stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=self.env)
        stdout, stderr = process.communicate()
        if stdout:
            decoded_stdout = stdout.decode('utf-8')
            if len([m.start() for m in re.finditer('\[on\]', decoded_stdout)]) == 2:
                print("on")
                logger.info("Mic: on")
                return 1
            elif len([m.start() for m in re.finditer('\[off\]', decoded_stdout)]) == 2:
                print("off")
                logger.info("Mic: off")
                return 0           
            else:
                print("error")
                logger.info("Mic: unknown")
        if stderr:
            decoded_stderr = stdout.decode('utf-8')
            print(decoded_stderr)
            logger.error("Mic:  %s, %s", decoded_stderr, len(decoded_stderr))

        return -1
        

if (__name__ == "__main__"):
    core = Microphone()
    core.Toggle()