"""Substitute dtaas.toml config values into generated deployment files."""

from pathlib import Path
from ._deploy_data import (
    _BINARY_EXTENSIONS,
    _DEPLOY_CREDS,
    _SERVER_DNS_PLACEHOLDERS,
    _USER_NAME_PATTERNS,
    _USER_PATH_PATTERNS,
    _USER_EMAIL_PATTERNS,
)


def _is_text_file(path):
    return path.is_file() and path.suffix.lower() not in _BINARY_EXTENSIONS


def _substitute(text, mapping):
    """Replace placeholders in text; longer keys are replaced first."""
    for placeholder, value in sorted(mapping.items(), key=lambda x: -len(x[0])):
        text = text.replace(placeholder, value)
    return text


def _apply_to_file(path, mapping):
    """Apply substitution mapping to one text file. Returns error string or None."""
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        new_content = _substitute(content, mapping)
        if new_content != content:
            path.write_text(new_content, encoding="utf-8")
    except OSError as exc:
        return str(exc)
    return None


def _collect_errors(dest_dir, mapping):
    """Return list of error strings from applying mapping to all text files."""
    errors = []
    for path in Path(dest_dir).rglob("*"):
        if not _is_text_file(path):
            continue
        err = _apply_to_file(path, mapping)
        if err:
            errors.append(err)
    return errors


def apply_config(dest_dir, mapping):
    """Apply substitutions to all text files under dest_dir. Raises OSError on failure."""
    if not mapping:
        return
    errors = _collect_errors(dest_dir, mapping)
    if errors:
        raise OSError("\n".join(errors))


def _add_deploy_entries(deploy_type, section, mapping):
    """Add deploy-type credential substitutions to mapping."""
    for toml_key, placeholder, fmt in _DEPLOY_CREDS.get(deploy_type, []):
        value = str(section.get(toml_key, "")).strip()
        if value:
            mapping[placeholder] = fmt.format(value)


def _add_common_entries(common, mapping):
    """Add common section (server-dns) substitutions to mapping."""
    server_dns = str(common.get("server-dns", "")).strip()
    if not server_dns:
        return
    for placeholder, fmt in _SERVER_DNS_PLACEHOLDERS:
        mapping[placeholder] = fmt.format(server_dns)


def _add_email_entries(user_index, email, mapping):
    """Add email substitutions for one user to mapping."""
    prefix = f"user{user_index + 1}@"
    for ph in _USER_EMAIL_PATTERNS:
        if prefix in ph:
            mapping[ph] = email


def _add_user_entries(users, mapping):
    """Add username and email substitutions to mapping."""
    for i, username in enumerate(users.get("add", [])[:2]):
        username = str(username).strip()
        if not username:
            continue
        placeholder, fmt = _USER_NAME_PATTERNS[i]
        mapping[placeholder] = fmt.format(username)
        mapping[_USER_PATH_PATTERNS[i]] = f"/{username}"
        email = str(users.get(username, {}).get("email", "")).strip()
        if email:
            _add_email_entries(i, email, mapping)


def build_mapping(deploy_type, toml_data):
    """Return {placeholder: value} substitution mapping for deploy_type and config."""
    mapping = {}
    _add_deploy_entries(deploy_type, toml_data.get(deploy_type, {}), mapping)
    _add_common_entries(toml_data.get("common", {}), mapping)
    _add_user_entries(toml_data.get("users", {}), mapping)
    return mapping
