"""This file supports the DTaaS config class"""

import click
from src.pkg import utils


class Config:
    """The Config class for DTaaS"""

    def __init__(self):
        config, err = utils.importToml("dtaas.toml")
        if err is not None:
            raise click.ClickException("config initialisation failed: " + str(err))
        self.data = config

    def getConfig(self):
        """Gets the config dictionary"""
        if self.data is not None:
            return self.data, None
        return None, Exception("Config not initialised")

    def getFromConfig(self, key):
        """Gets the specific key from config"""
        conf, err = self.getConfig()
        if err is not None:
            return None, err

        if key not in conf:
            return None, Exception(f"Config file error: Missing {key} tag")
        return conf[key], None

    def getCommon(self):
        """Gets the 'common' section of config"""
        common, err = self.getFromConfig("common")
        return common, err

    def getStringFromCommon(self, key):
        """Gets the specific string key from config.common"""
        confCommon, err = self.getCommon()
        if err is not None:
            return None, err

        if key not in confCommon or confCommon[key] == "":
            return None, Exception(
                f"Config file error: config.common.{key} not set in TOML"
            )
        return str(confCommon[key]), None

    def getUsers(self):
        """Gets the 'users' section of config"""
        users, err = self.getFromConfig("users")
        return users, err


    def getStringListFromUsers(self, key):
        """Gets the specific key as a list of strings from config.users"""
        err = None
        stringsList = None

        confUsers, err = self.getUsers()
        if err is not None:
            return None, err

        try:
            stringsList = [ str(x) for x in confUsers[key]]
            if len(stringsList) == 0:
                stringsList = None
                raise ValueError
        except KeyError:
            err = Exception(f"Config file error: No {key} list in 'users' tag")
        except ValueError:
            err = Exception(f'Config file error: users.{key} list is empty')

        return stringsList, err

    def getPath(self):
        """Gets the 'path' from config.common"""
        path, err = self.getStringFromCommon("path")
        return path, err

    def getServerDNS(self):
        """Gets the 'server-dns' from config.common"""
        server, err = self.getStringFromCommon("server-dns")
        return server, err

    def getAddUsersList(self):
        """Gets the 'add' list from config.users"""
        addUsersList, err = self.getStringListFromUsers("add")
        return addUsersList, err

    def getDeleteUsersList(self):
        """Gets the 'delete' list from config.users"""
        deleteUsersList, err = self.getStringListFromUsers("delete")
        return deleteUsersList, err
