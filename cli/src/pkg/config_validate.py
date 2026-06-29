"""Validate the values in a dtaas.toml configuration file.

Used by 'dtaas admin config validate'. Each check returns a list of human
readable problems (empty when acceptable); validate_config aggregates them so
the user sees every issue at once rather than one at a time.
"""

import ipaddress
import re
from pathlib import Path, PurePosixPath, PureWindowsPath
from email_validator import EmailNotValidError, validate_email
from fqdn import FQDN
from . import utils


URL_RE = re.compile(r"^https?://[A-Za-z0-9.-]+(:\d+)?(/[A-Za-z0-9._~%/+-]*)?$")
SIZE_RE = re.compile(r"^\d+(\.\d+)?\s*([kmgt]i?b?|b)$", re.IGNORECASE)
USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
NUMERIC_HOST_RE = re.compile(r"^[0-9.]+$")

_SIZE_FIELDS = (("mem_limit", "4G"), ("shm_size", "512m"))
_LIST_FIELDS = ("add", "delete")


def _get(data, *keys):
    """Return the nested value at *keys*, or None if any step is missing."""
    node = data
    for key in keys:
        node = node.get(key) if isinstance(node, dict) else None
    return node


def _is_url(value):
    """True when *value* is an http(s) URL (case-insensitive) with a host/path."""
    return isinstance(value, str) and bool(URL_RE.match(value.lower()))


def _is_ip(value):
    """True when *value* is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def _is_fqdn(value):
    """True when *value* is an RFC 1123 fully qualified domain name."""
    return FQDN(value).is_valid


def _is_host(value):
    """True for 'localhost', an IP literal, or a dotted FQDN (numeric => IP)."""
    if not isinstance(value, str):
        return False
    if NUMERIC_HOST_RE.match(value):
        return _is_ip(value)
    return value == "localhost" or _is_fqdn(value)


def _is_abs_path(value):
    """True when *value* is an absolute path in POSIX or Windows form."""
    if not isinstance(value, str) or not value.strip():
        return False
    return PurePosixPath(value).is_absolute() or PureWindowsPath(value).is_absolute()


def _is_existing_dir(value):
    """True when *value* is an absolute path to a directory that exists."""
    return _is_abs_path(value) and Path(value).is_dir()


def _is_int(value):
    """True when *value* is an integer (and not a bool, which subclasses int)."""
    return isinstance(value, int) and not isinstance(value, bool)


def _is_number(value):
    """True when *value* is a positive number of cores (int or float, not bool)."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return value > 0


def _is_size(value):
    """True when *value* is a byte size with a required unit, e.g. '4G' or '512m'."""
    return isinstance(value, str) and bool(SIZE_RE.match(value))


def _is_email(value):
    """True when *value* is a valid email address (no DNS lookup)."""
    try:
        validate_email(value, check_deliverability=False)
        return True
    except (EmailNotValidError, TypeError):  # TypeError: non-string value
        return False


def _is_username(value):
    """True when *value* is a non-empty username (alphanumeric plus . _ -)."""
    return isinstance(value, str) and bool(USERNAME_RE.match(value))


def _required(data, keys, predicate, message):
    """Return [message] if the value at *keys* is missing or fails *predicate*."""
    value = _get(data, *keys)
    if value is None:
        return [".".join(keys) + " is missing"]
    return [] if predicate(value) else [message]


def _optional(data, keys, predicate, message):
    """Like _required, but a missing value is allowed (no error)."""
    value = _get(data, *keys)
    if value is None:
        return []
    return [] if predicate(value) else [message]


def _check_git_repo(data):
    """git-repo must be a URL."""
    return _required(data, ("git-repo",), _is_url, "git-repo must be a valid URL")


def _check_server_dns(data):
    """common.server-dns must be a hostname or IP."""
    message = "common.server-dns must be a valid hostname or IP address"
    return _required(data, ("common", "server-dns"), _is_host, message)


def _check_path(data):
    """common.path must be an absolute path to an existing directory."""
    message = "common.path must be an absolute path to an existing directory"
    return _required(data, ("common", "path"), _is_existing_dir, message)


def _check_certs_src(data):
    """common.security.certs-src, when present, must be an existing directory."""
    keys = ("common", "security", "certs-src")
    message = (
        "common.security.certs-src must be an absolute path to an existing directory"
    )
    return _optional(data, keys, _is_existing_dir, message)


def _check_resources(data):
    """cpus is a positive number; pids_limit an integer; mem/shm are byte sizes."""
    cpus_msg = "common.resources.cpus must be a positive number of CPU cores"
    errors = _required(data, ("common", "resources", "cpus"), _is_number, cpus_msg)
    pids_msg = "common.resources.pids_limit must be an integer"
    errors += _required(data, ("common", "resources", "pids_limit"), _is_int, pids_msg)
    for field, example in _SIZE_FIELDS:
        message = f"common.resources.{field} must include a unit, e.g. '{example}'"
        errors += _required(data, ("common", "resources", field), _is_size, message)
    return errors


def _is_string_list(value):
    """True when *value* is a list whose entries are all strings."""
    return isinstance(value, list) and all(isinstance(x, str) for x in value)


def _check_user_lists(data):
    """users.add and users.delete, when present, must be lists of strings."""
    errors = []
    for field in _LIST_FIELDS:
        message = f"users.{field} must be a list of strings"
        errors += _optional(data, ("users", field), _is_string_list, message)
    return errors


def _email_error(name, info):
    """Return an error for a user sub-table whose email is missing or invalid."""
    if not isinstance(info, dict):
        return []
    if _is_email(info.get("email", "")):
        return []
    return [f"users.{name}.email is not a valid email address"]


def _check_emails(data):
    """Every [users.<name>] sub-table must hold a valid email."""
    users = _get(data, "users")
    if not isinstance(users, dict):
        return []
    errors = []
    for name, info in users.items():
        errors += _email_error(name, info)
    return errors


# Deployment-section fields checked when present: (section, key, predicate, label).
_DEPLOY_FIELDS = (
    ("frontend", "react-app-oauth-url", _is_url, "URL"),
    ("localhost", "auth-authority", _is_url, "URL"),
    ("localhost", "default-user", _is_username, "username"),
    ("insecure-server", "oauth-url", _is_url, "URL"),
    ("secure-server", "oauth-url", _is_url, "URL"),
    ("workspace-localhost", "auth-authority", _is_url, "URL"),
    ("workspace-localhost", "default-user", _is_username, "username"),
    ("workspace-secure-server", "keycloak-issuer-url", _is_url, "URL"),
    ("workspace-secure-server", "auth-authority", _is_url, "URL"),
)


def _check_deploy_fields(data):
    """Validate URL/username fields across deployment sections when present."""
    errors = []
    for section, key, predicate, label in _DEPLOY_FIELDS:
        message = f"{section}.{key} must be a valid {label}"
        errors += _optional(data, (section, key), predicate, message)
    return errors


_CHECKS = (
    _check_git_repo,
    _check_server_dns,
    _check_path,
    _check_certs_src,
    _check_resources,
    _check_user_lists,
    _check_emails,
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
