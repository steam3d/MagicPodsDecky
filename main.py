import os
import logging
from logging.handlers import RotatingFileHandler
from mp.core import CoreService
from mp.settings import Settings
from mp.player import Player
import decky

# Setup logger level prefix
logging.addLevelName(logging.DEBUG,    "DBG")
logging.addLevelName(logging.INFO,     "INF")
logging.addLevelName(logging.WARNING,  "WRN")
logging.addLevelName(logging.ERROR,    "ERR")
logging.addLevelName(logging.CRITICAL, "CRT")

# Setup logger
_logger = logging.getLogger("magicpods")
file_handler = RotatingFileHandler(os.path.join(decky.DECKY_PLUGIN_LOG_DIR, "magicpodslog.txt"), mode='a', maxBytes=5*1024*1024, backupCount=1)
formatter = logging.Formatter('%(asctime)s  %(levelname)-3s  %(tag)s  %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
file_handler.setFormatter(formatter)
_logger.addHandler(file_handler)

# Custom loggers
logger = logging.LoggerAdapter(_logger, {"tag": "py"})

def bin_logging(msg):
    _logger.error(msg, extra={"tag": "bi"})

class Plugin:

    async def start_backed(self):
        self.core.start()

    async def restart_backend(self):
        logger.info("Restarting")
        self.core.restart()

    async def logger_react(self, msg):
        _logger.warning(msg, extra={"tag": "re"})

    async def load_setting(self, key):
        return self.settings.load(key)

    async def save_setting(self, key, value):
        self.settings.save(key, value)

    async def read_logs(self):
        output = ""
        with open(os.path.join(decky.DECKY_PLUGIN_LOG_DIR, "magicpodslog.txt")) as file:
            for line in (file.readlines() [-150:]):
                output += line
        return output

    async def update_log_level(self):
        lvl = int(self.settings.load("log_level"))
        _logger.setLevel(lvl)
        for handler in _logger.handlers:
            handler.setLevel(lvl)
        logger.critical("Set log level to %d ", lvl)

    async def debug_start_backed(self):
        self.is_backend_allowed = True # do not forget to add this to debug methods
        self.core.start()

    async def debug_stop_backed(self):
        self.is_backend_allowed = False # do not forget to add this to debug methods
        self.core.stop()

    # Used to prevent reconnecting websocket when backend off
    async def backend_allowed(self):
        return self.is_backend_allowed

    async def play(self):
        self.player.start()

    async def stop(self):
        self.player.stop()

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        self.settings = Settings(decky.DECKY_PLUGIN_SETTINGS_DIR)
        await self.update_log_level()

        logger.info("_main %s starting", decky.DECKY_PLUGIN_VERSION)
        self.core = CoreService(os.path.join(decky.DECKY_PLUGIN_DIR, "bin"), "MagicPodsCore", bin_logging)
        self.is_backend_allowed = True # Allow reconnecting socket when user using plugin
        self.player = Player(os.path.join(decky.DECKY_PLUGIN_DIR, "silence.mp3"),bin_logging)

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
