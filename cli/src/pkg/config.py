"""This file supports the DTaaS config class"""

from . import utils


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
        """Gets the '[[users]]' array of tables from config, as a list of dicts.

        The 'users' key is optional; when absent this returns an empty list
        rather than an error.
        """
        conf, err = self.get_config()
        if err is not None or conf is None:
            return None, err
        users = conf.get("users", [])
        if not isinstance(users, list):
            return None, Exception(
                "Config file error: 'users' must be an array of tables ([[users]])"
            )
        if not all(isinstance(u, dict) for u in users):
            return None, Exception(
                "Config file error: each [[users]] entry must be a table"
            )
        return users, None

    def get_starting_users(self):
        """Gets the usernames declared by [[users]] in config."""
        users, err = self.get_users()
        if err is not None or users is None:
            return None, err
        names = (str(u.get("username", "")).strip() for u in users)
        return [name for name in names if name], None

    def get_user_emails(self):
        """Gets {username: email} for every [[users]] record in config.

        No caller yet; added alongside get_users()/get_starting_users() as
        groundwork for upcoming GitLab-provisioning work (#1693).
        """
        users, err = self.get_users()
        if err is not None or users is None:
            return None, err
        return {
            str(u.get("username", "")).strip(): str(u.get("email", "")).strip()
            for u in users
            if str(u.get("username", "")).strip()
        }, None

    def get_path(self):
        """Gets the 'path' from config.common"""
        path, err = self.get_string_from_common("path")
        return path, err

    def get_server_dns(self):
        """Gets the 'server-dns' from config.common"""
        server, err = self.get_string_from_common("server-dns")
        return server, err

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

    def get_gitlab_section(self):
        """Gets the '[gitlab]' section of config, or {} when absent."""
        conf, err = self.get_config()
        if err is not None or conf is None:
            return None, err
        section = conf.get("gitlab", {})
        if not isinstance(section, dict):
            return None, Exception("Config file error: [gitlab] section is not a table")
        return section, None

    def get_gitlab_provision(self):
        """Gets [gitlab].provision (default False): enables GitLab user
        provisioning on 'user add'. Existing deployments are unaffected
        unless this is explicitly set."""
        section, err = self.get_gitlab_section()
        if err is not None or section is None:
            return False, err
        return bool(section.get("provision", False)), None

    def get_gitlab_api_url(self):
        """Gets [gitlab].api_url, required when provisioning is enabled."""
        section, err = self.get_gitlab_section()
        if err is not None or section is None:
            return None, err
        api_url = str(section.get("api_url", "")).strip()
        if not api_url:
            return None, Exception("Config file error: [gitlab].api_url is not set")
        return api_url, None

    def get_gitlab_pat(self):
        """Gets [gitlab].pat, or '' when absent so callers can fall back to
        the DTAAS_GITLAB_PAT environment variable."""
        section, err = self.get_gitlab_section()
        if err is not None or section is None:
            return "", err
        return str(section.get("pat", "")).strip(), None

    def get_gitlab_ssl_verify(self):
        """Gets [gitlab].ssl_verify (default True): True/False, or the path
        to a CA bundle to verify a self-hosted GitLab's own CA against. A
        non-empty string is passed through unchanged rather than coerced by
        bool()."""
        section, err = self.get_gitlab_section()
        if err is not None or section is None:
            return True, err
        value = section.get("ssl_verify", True)
        if isinstance(value, str) and value.strip():
            return value.strip(), None
        return bool(value), None
