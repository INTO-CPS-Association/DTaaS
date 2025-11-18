"""This file supports the DTaaS config class"""

import click
from src.pkg import utils


class Config:
    """The Config class for DTaaS"""

    def __init__(self):
        config, err = utils.import_toml("dtaas.toml")
        if err is not None:
            raise click.ClickException("config initialisation failed: " + str(err))
        self.data = config

    def get_config(self):
        """Gets the config dictionary"""
        if self.data is not None:
            return self.data, None
        return None, Exception("Config not initialised")

    def get_from_config(self, key):
        """Gets the specific key from config"""
        conf, err = self.get_config()
        if err is not None:
            return None, err

        if key not in conf:
            return None, Exception(f"Config file error: Missing {key} tag")
        return conf[key], None

    def get_common(self):
        """Gets the 'common' section of config"""
        common, err = self.get_from_config("common")
        return common, err

    def get_string_from_common(self, key):
        """Gets the specific string key from config.common"""
        conf_common, err = self.get_common()
        if err is not None:
            return None, err

        if key not in conf_common or conf_common[key] == "":
            return None, Exception(
                f"Config file error: config.common.{key} not set in TOML"
            )
        return str(conf_common[key]), None

    def get_users(self):
        """Gets the 'users' section of config"""
        users, err = self.get_from_config("users")
        return users, err


    def get_string_list_from_users(self, key):
        """Gets the specific key as a list of strings from config.users"""
        err = None
        strings_list = None

        conf_users, err = self.get_users()
        if err is not None:
            return None, err

        try:
            strings_list = [ str(x) for x in conf_users[key]]
            if len(strings_list) == 0:
                strings_list = None
                raise ValueError
        except KeyError:
            err = Exception(f"Config file error: No {key} list in 'users' tag")
        except ValueError:
            err = Exception(f'Config file error: users.{key} list is empty')

        return strings_list, err

    def get_path(self):
        """Gets the 'path' from config.common"""
        path, err = self.get_string_from_common("path")
        return path, err

    def get_server_dns(self):
        """Gets the 'server-dns' from config.common"""
        server, err = self.get_string_from_common("server-dns")
        return server, err

    def get_add_users_list(self):
        """Gets the 'add' list from config.users"""
        add_users_list, err = self.get_string_list_from_users("add")
        return add_users_list, err

    def get_delete_users_list(self):
        """Gets the 'delete' list from config.users"""
        delete_users_list, err = self.get_string_list_from_users("delete")
        return delete_users_list, err

    def get_resource_limits(self):
        """Gets the default resourse limits"""
        conf_common, err = self.get_common()
        if err is not None:
            return None, err
        # It's assumed that resources is given in dtaas.toml
        resources = conf_common.get("resources", None)
        if resources is None:
            err = Exception("Config file error: Missing default resources limits")
            return None, err
        return resources, None
