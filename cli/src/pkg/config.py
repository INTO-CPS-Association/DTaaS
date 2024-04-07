"""This file supports the DTaaS config class"""

import click
from src.pkg import utils

class Config:
    """The Config class for DTaaS"""

    def __init__(self):
        config, err = utils.importToml('dtaas.toml')
        if err is not None:
            raise click.ClickException("config initialisation failed: "+str(err))
        self.data = config

    def getConfig(self):
        """Gets the config dictionary"""
        if self.data is not None:
            return self.data,None
        return None, Exception("Config not initialised")

    def getCommon(self):
        """Gets the 'common' section of config """
        conf, err = self.getConfig()
        if err is not None:
            return None, err

        if 'common' not in conf:
            return None, Exception("Config file error: Missing 'common' tag")
        return conf['common'], None

    def getUsers(self):
        """Gets the 'users' section of config """
        conf, err = self.getConfig()
        if err is not None:
            return None, err

        if 'users' not in conf:
            return None, Exception("Config file error: Missing 'users' tag")
        return conf['users'], None


    def getPath(self):
        """Gets the 'path' from config.common """
        confCommon, err = self.getCommon()
        if err is not None:
            return None, err

        if 'path' not in confCommon or confCommon['path']=="":
            return None, Exception("Config file error: DTaaS directory path not set in TOML")
        return  str(confCommon['path']), None

    def getServerDNS(self):
        """Gets the 'server-dns' from config.common """
        confCommon, err = self.getCommon()
        if err is not None:
            return None, err

        if 'server-dns' not in confCommon and confCommon['server-dns']=="":
            return None, Exception("Config file error: The server dns isn't set in TOML")
        return str(confCommon['server-dns']), None

    def getAddUsersList(self):
        """Gets the 'add' list from config.users """
        confUsers, err = self.getUsers()
        if err is not None:
            return None, err

        if 'add' not in confUsers:
            return None, Exception("Config file error: No 'add' list in 'users' tag")
        addUsersList = [ str(username) for username in confUsers['add']]
        return addUsersList, None

    def getDeleteUsersList(self):
        """Gets the 'delete' list from config.users """
        confUsers, err = self.getUsers()
        if err is not None:
            return None, err

        if 'delete' not in confUsers:
            return None, Exception("Config file error: No 'delete' list in 'users' tag")
        deleteUsersList = [str(username) for username in confUsers['delete']]
        return deleteUsersList, None
