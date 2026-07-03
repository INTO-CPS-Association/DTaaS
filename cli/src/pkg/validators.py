"""Generic, DTaaS-agnostic value predicates and rule-running helpers.

Used by config_validate.py to check individual dtaas.toml values. Nothing
here knows about dtaas.toml's specific field names or structure.
"""

import ipaddress
from pathlib import Path, PurePosixPath, PureWindowsPath
from email_validator import EmailNotValidError, validate_email
from fqdn import FQDN
from .constants import NUMERIC_HOST_RE, SIZE_RE, URL_RE, USERNAME_RE


def get_nested(data, *keys):
    """Return the nested value at *keys*, or None if any step is missing."""
    node = data
    for key in keys:
        node = node.get(key) if isinstance(node, dict) else None
    return node


def is_url(value):
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


def is_host(value):
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


def is_existing_dir(value):
    """True when *value* is an absolute path to a directory that exists."""
    return _is_abs_path(value) and Path(value).is_dir()


def is_int(value):
    """True when *value* is an integer (and not a bool, which subclasses int)."""
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    """True when *value* is a positive number of cores (int or float, not bool)."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return value > 0


def is_size(value):
    """True when *value* is a byte size with a required unit, e.g. '4G' or '512m'."""
    return isinstance(value, str) and bool(SIZE_RE.match(value))


def is_email(value):
    """True when *value* is a valid email address (no DNS lookup)."""
    try:
        validate_email(value, check_deliverability=False)
        return True
    except (EmailNotValidError, TypeError):  # TypeError: non-string value
        return False


def is_username(value):
    """True when *value* is a non-empty username (alphanumeric plus . _ -)."""
    return isinstance(value, str) and bool(USERNAME_RE.match(value))


def is_string_list(value):
    """True when *value* is a list whose entries are all strings."""
    return isinstance(value, list) and all(isinstance(x, str) for x in value)


def required(data, keys, rule):
    """Return [message] if the value at *keys* is missing or fails *rule*.

    *rule* is a (predicate, message) pair.
    """
    predicate, message = rule
    value = get_nested(data, *keys)
    if value is None:
        return [".".join(keys) + " is missing"]
    return [] if predicate(value) else [message]


def optional(data, keys, rule):
    """Like required, but a missing value is allowed (no error)."""
    predicate, message = rule
    value = get_nested(data, *keys)
    if value is None:
        return []
    return [] if predicate(value) else [message]
