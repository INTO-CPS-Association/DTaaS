"""This file supports the DTaaS config class"""

from . import utils


def _users_list_error(conf_users, key):
    """Return an Exception describing why config.users.<key> is invalid, or None."""
    if key not in conf_users:
        return Exception(f"Config file error: No {key} list in 'users' tag")
    value = conf_users[key]
    is_list = isinstance(value, list)
    if not is_list or not value:
        problem = "must be a list" if not is_list else "list is empty"
        return Exception(f"Config file error: users.{key} {problem}")
    return None


class Config:
    """The Config class for DTaaS"""

    def __init__(self):
        config, err = utils.import_toml("dtaas.toml")
        if err is not None:
            raise RuntimeError("config initialisation failed: " + str(err))
        self.data = config

    def get_config(self):
        """Gets the config dictionary"""
        if self.data is not None:
            return self.data, None
        return None, Exception("Config not initialised")

    def get_from_config(self, key):
        """Gets the specific key from config"""
        conf, err = self.get_config()
        if err is not None or conf is None:
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
        if err is not None or not isinstance(conf_common, dict):
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
        conf_users, err = self.get_users()
        if err is not None or not isinstance(conf_users, dict):
            return None, err

        err = _users_list_error(conf_users, key)
        if err is not None:
            return None, err

        return [str(x) for x in conf_users[key]], None

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
        """Gets the default resource limits"""
        conf_common, err = self.get_common()
        if err is not None or not isinstance(conf_common, dict):
            return None, err
        resources = conf_common.get("resources", None)
        if resources is None:
            err = Exception("Config file error: Missing default resources limits")
            return None, err
        return resources, None

    def get_set_limits(self):
        """Gets the set_limits flag from config.common.resources (default True).

        When false, user containers are created without resource limits.
        """
        conf_common, err = self.get_common()
        if err is not None or not isinstance(conf_common, dict):
            return True, err
        resources = conf_common.get("resources", {})
        if not isinstance(resources, dict):
            return True, Exception("Config file error: resources section is not a dict")
        return bool(resources.get("set_limits", True)), None

    def get_tls(self):
        """Gets the TLS flag from config.common.security"""
        conf_common, err = self.get_common()
        if err is not None or not isinstance(conf_common, dict):
            return False, err
        security = conf_common.get("security", {})
        if not isinstance(security, dict):
            return False, Exception("Config file error: security section is not a dict")
        tls = security.get("tls", False)
        return bool(tls), None
