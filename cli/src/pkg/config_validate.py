"""Validate the values in a dtaas.toml configuration file.

Used by 'dtaas admin config validate'. Each check returns a list of human
readable problems (empty when acceptable); validate_config aggregates them so
the user sees every issue at once rather than one at a time. See
validators.py for the generic, DTaaS-agnostic predicates each check builds on.
"""

from . import utils
from .validators import (
    get_nested,
    is_email,
    is_existing_dir,
    is_host,
    is_int,
    is_number,
    is_size,
    is_string_list,
    is_url,
    is_username,
    optional,
    required,
)

_SIZE_FIELDS = (("mem_limit", "4G"), ("shm_size", "512m"))


def _check_git_repo(data):
    """git-repo must be a URL."""
    return required(data, ("git-repo",), (is_url, "git-repo must be a valid URL"))


def _check_server_dns(data):
    """common.server-dns must be a hostname or IP."""
    message = "common.server-dns must be a valid hostname or IP address"
    return required(data, ("common", "server-dns"), (is_host, message))


def _check_path(data):
    """common.path must be an absolute path to an existing directory."""
    message = "common.path must be an absolute path to an existing directory"
    return required(data, ("common", "path"), (is_existing_dir, message))


def _check_certs_src(data):
    """common.security.certs-src, when present, must be an existing directory."""
    keys = ("common", "security", "certs-src")
    message = (
        "common.security.certs-src must be an absolute path to an existing directory"
    )
    return optional(data, keys, (is_existing_dir, message))


def _check_resources(data):
    """Resource limits, required unless common.resources.set_limits is false.

    With set_limits = false the container runs uncapped, so the fields are
    optional; any values that are present are still checked.
    """
    enabled = get_nested(data, "common", "resources", "set_limits") is not False
    check = required if enabled else optional
    cpus_msg = "common.resources.cpus must be a positive number of CPU cores"
    errors = check(data, ("common", "resources", "cpus"), (is_number, cpus_msg))
    pids_msg = "common.resources.pids_limit must be an integer"
    errors += check(data, ("common", "resources", "pids_limit"), (is_int, pids_msg))
    for field, example in _SIZE_FIELDS:
        message = f"common.resources.{field} must include a unit, e.g. '{example}'"
        errors += check(data, ("common", "resources", field), (is_size, message))
    return errors


def _check_starting(data):
    """users.starting, when present, must be a list of strings."""
    return optional(
        data,
        ("users", "starting"),
        (is_string_list, "users.starting must be a list of strings"),
    )


def _email_error(name, info):
    """users.<name>.email must be a valid address."""
    if is_email(info.get("email", "")):
        return []
    return [f"users.{name}.email is not a valid email address"]


def _groups_error(name, info):
    """users.<name>.groups, when present, must be a list of strings."""
    groups = info.get("groups")
    if groups is None or is_string_list(groups):
        return []
    return [f"users.{name}.groups must be a list of strings"]


def _load_balance_error(name, info):
    """users.<name>.load_balance, when present, must be a boolean."""
    load_balance = info.get("load_balance")
    if load_balance is None or isinstance(load_balance, bool):
        return []
    return [f"users.{name}.load_balance must be true or false"]


def _user_table_errors(name, info):
    """Validate one [users.<name>] sub-table; the starting list is not a table."""
    if not isinstance(info, dict):
        return []
    return (
        _email_error(name, info)
        + _groups_error(name, info)
        + _load_balance_error(name, info)
    )


def _check_user_tables(data):
    """Every [users.<name>] sub-table must hold a valid email and valid tags."""
    users = get_nested(data, "users")
    if not isinstance(users, dict):
        return []
    errors = []
    for name, info in users.items():
        errors += _user_table_errors(name, info)
    return errors


# Deployment-section fields checked when present: (section, key, predicate, label).
_DEPLOY_FIELDS = (
    ("frontend", "react-app-oauth-url", is_url, "URL"),
    ("localhost", "auth-authority", is_url, "URL"),
    ("localhost", "default-user", is_username, "username"),
    ("insecure-server", "oauth-url", is_url, "URL"),
    ("secure-server", "oauth-url", is_url, "URL"),
    ("workspace-localhost", "auth-authority", is_url, "URL"),
    ("workspace-localhost", "default-user", is_username, "username"),
    ("workspace-secure-server", "keycloak-issuer-url", is_url, "URL"),
    ("workspace-secure-server", "auth-authority", is_url, "URL"),
)


def _check_deploy_fields(data):
    """Validate URL/username fields across deployment sections when present."""
    errors = []
    for section, key, predicate, label in _DEPLOY_FIELDS:
        message = f"{section}.{key} must be a valid {label}"
        errors += optional(data, (section, key), (predicate, message))
    return errors


_CHECKS = (
    _check_git_repo,
    _check_server_dns,
    _check_path,
    _check_certs_src,
    _check_resources,
    _check_starting,
    _check_user_tables,
    _check_deploy_fields,
)


def collect_errors(data):
    """Run every check against *data* and return the combined list of problems."""
    errors = []
    for check in _CHECKS:
        errors += check(data)
    return errors


def validate_config(output_dir):
    """Validate dtaas.toml in *output_dir*, returning a list of problems.

    The list is empty when the configuration is valid. Raises FileNotFoundError
    when no dtaas.toml is found and ValueError when the file cannot be parsed.
    """
    toml_path = utils.find_toml(output_dir)
    if toml_path is None:
        raise FileNotFoundError(
            f"dtaas.toml not found in '{output_dir}' or the current directory"
        )
    data, err = utils.import_toml(str(toml_path))
    if err is not None:
        raise ValueError(str(err))
    return collect_errors(data)
