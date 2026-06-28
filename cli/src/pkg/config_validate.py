"""Validate the values in a dtaas.toml configuration file.

Used by 'dtaas admin config validate'. Each check returns a list of human
readable problems (empty when the value is acceptable); validate_config
aggregates them so the user sees every issue at once rather than one at a time.
"""

import re
from pathlib import Path, PurePosixPath, PureWindowsPath

from . import utils

# Reject odd URLs (e.g. stray '@@' in the path): require http(s), a host, an
# optional port, and a simple path made of safe characters only.
URL_RE = re.compile(r"^https?://[A-Za-z0-9.-]+(:\d+)?(/[A-Za-z0-9._~%/+-]*)?$")
# A server DNS must be fully qualified, so require at least one dot. 'localhost'
# is allowed separately; a bare single label (e.g. 'lossscalhost') is rejected.
FQDN_RE = re.compile(
    r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)"
    r"(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$"
)
# Domain labels exclude the dot separator, so matching is linear (no ReDoS).
EMAIL_RE = re.compile(r"^[^@\s]+@[^\s@.]+(\.[^\s@.]+)+$")
SIZE_RE = re.compile(r"^\d+(\.\d+)?\s*([kmgt]i?b?|b)?$", re.IGNORECASE)
USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")

_INT_FIELDS = ("cpus", "pids_limit")
_SIZE_FIELDS = (("mem_limit", "4G"), ("shm_size", "512m"))
_LIST_FIELDS = ("add", "delete")


def _get(data, *keys):
    """Return the nested value at *keys*, or None if any step is missing."""
    node = data
    for key in keys:
        node = node.get(key) if isinstance(node, dict) else None
    return node


def _is_url(value):
    """True when *value* is an http(s) URL with a host and a simple path."""
    return isinstance(value, str) and bool(URL_RE.match(value))


def _is_host(value):
    """True for 'localhost', an IP literal, or a dotted hostname (FQDN).

    A bare single-label name such as 'lossscalhost' is rejected: a server DNS
    must be localhost or fully qualified, which always contains a dot.
    """
    if not isinstance(value, str):
        return False
    if value == "localhost":
        return True
    return bool(FQDN_RE.match(value))


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


def _is_size(value):
    """True when *value* is a size string such as '4G' or '512m'."""
    return isinstance(value, str) and bool(SIZE_RE.match(value))


def _is_email(value):
    """True when *value* looks like an email address."""
    return isinstance(value, str) and bool(EMAIL_RE.match(value))


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
    return _required(
        data,
        ("common", "server-dns"),
        _is_host,
        "common.server-dns must be a valid hostname or IP address",
    )


def _check_path(data):
    """common.path must be an absolute path to an existing directory."""
    return _required(
        data,
        ("common", "path"),
        _is_existing_dir,
        "common.path must be an absolute path to an existing directory",
    )


def _check_certs_src(data):
    """common.security.certs-src, when present, must be an existing directory."""
    return _optional(
        data,
        ("common", "security", "certs-src"),
        _is_existing_dir,
        "common.security.certs-src must be an absolute path to an existing directory",
    )


def _check_resources(data):
    """cpus/pids_limit must be integers; mem_limit/shm_size must be size strings."""
    errors = []
    for field in _INT_FIELDS:
        message = f"common.resources.{field} must be an integer"
        errors += _required(data, ("common", "resources", field), _is_int, message)
    for field, example in _SIZE_FIELDS:
        message = f"common.resources.{field} must be a size string like '{example}'"
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
