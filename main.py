import os
import logging
from logging.handlers import RotatingFileHandler
from mp.core import CoreService
from mp.settings import Settings
import decky_plugin
import time

# Create a logger
lvl = logging.DEBUG
_logger = logging.getLogger("magicpods")
_logger.setLevel(lvl)

# Create a file handler and set the level to DEBUG
file_handler = RotatingFileHandler(os.path.join(decky_plugin.DECKY_PLUGIN_LOG_DIR, "magicpodslog.txt"), mode='a', maxBytes=5*1024*1024, backupCount=0)
file_handler.setLevel(lvl)

# Create a console handler and set the level to INFO
console_handler = logging.StreamHandler()
console_handler.setLevel(lvl)

# Create a formatter and set it to the handlers
formatter = logging.Formatter('%(asctime)s  %(levelname)-5s  %(tag)s    %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add the handlers to the logger
_logger.addHandler(file_handler)
_logger.addHandler(console_handler)

logger = logging.LoggerAdapter(_logger, {"tag": "py"})

def bin_logging(msg):
    _logger.info(msg, extra={"tag": "bi"})

class Plugin:

    async def start_backed(self):
        self.core.start()

    async def restart_backend(self):
        logger.info("Restarting")
        self.core.restart()

    async def logger_react(self, msg):
        _logger.info(msg, extra={"tag": "re"})

    async def load_setting(self, key):
        return self.settings.load(key)

    async def save_setting(self, key, value):
        self.settings.save(key, value)

    async def read_logs(self):
        output = ""
        with open(os.path.join(decky_plugin.DECKY_PLUGIN_LOG_DIR, "magicpodslog.txt")) as file:
            for line in (file.readlines() [-150:]):
                output += line
        return output

    async def debug_start_backed(self):
        self.is_backend_allowed = True # do not forget to add this to debug methods
        self.core.start()

    async def debug_stop_backed(self):
        self.is_backend_allowed = False # do not forget to add this to debug methods
        self.core.stop()

    # Used to prevent reconnecting websocket when backend off
    async def backend_allowed(self):
        return self.is_backend_allowed


    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        logger.debug("_main starting")
        self.settings = Settings(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR)
        self.core = CoreService(decky_plugin.DECKY_PLUGIN_DIR, "MagicPodsCore", bin_logging)
        self.is_backend_allowed = True # Allow reconnecting socket when user using plugin

        self.core.start()
        logger.info("_main finished")

    # Function called first during the unload process, utilize this to handle your plugin being removed
    async def _unload(self):
        self.is_backend_allowed = False # Does not allow reconnecting socket when user delete plugin
        self.core.stop()
        logger.info("_unload finished")

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        pass
