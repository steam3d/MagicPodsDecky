import configparser
import os
import logging

_logger = logging.getLogger("magicpods")
logger = logging.LoggerAdapter(_logger, {'tag': 'py'})

class Settings():
    def __init__(self, settings_dir):
        self.config = configparser.ConfigParser()
        self.configpath = os.path.join(settings_dir, "settings.ini")

        if os.path.exists(self.configpath):
            self.config.read(self.configpath)
            logging.info("Loading settings.ini")
        else:
            self.config["Settings"] = {"version": 1}
            logging.info("settings.ini does not exist. Create virtual settings")


    def load(self, key):
        value = self._storage(key)
        logger.debug("Load setting  %s -> %s", key, value)
        return value

    def save(self, key, value):
        logger.debug("Save setting  %s -> %s", key, value)
        self.config["Settings"][key] = str(value)
        with open(self.configpath, 'w') as configfile:
            self.config.write(configfile)

    def _storage(self, key):
        branch = self.config["Settings"]
        if key == "notif_low_battery":
            return branch.get(key, 30)
        elif key == "anc_l5_r5_switch":
            return branch.get(key, False)
        elif key == "fix_disconnects":
            return branch.get(key, False)
        elif key == "mic_qam_l5_toggle":
            return branch.get(key, False)
        elif key == "check_update":
            return branch.get(key, True)
        else:
            return None
