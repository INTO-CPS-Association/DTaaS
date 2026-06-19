"""Substitute dtaas.toml config values into generated deployment files."""

import re
from pathlib import Path
from ._deploy_data import _DEPLOY_FILES, _SECRET_PLACEHOLDERS


def _set_env_value(text, key, value):
    """Set ``key=value`` on its line in a dotenv-style file."""
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    return pattern.sub(lambda _: f"{key}={value}", text)


def _set_js_value(text, key, value):
    """Set the quoted value of ``key`` in a window.env object literal."""
    pattern = re.compile(rf"\b({re.escape(key)}\s*:\s*')[^']*(')")
    return pattern.sub(
        lambda m: m.group(1) + value.replace("'", "\\'") + m.group(2), text
    )


def _set_yaml_value(text, key, value):
    """Set the scalar value of ``key:``, preserving indentation."""
    pattern = re.compile(rf"^(\s*(?:- )?{re.escape(key)}: ).*$", re.MULTILINE)
    return pattern.sub(lambda m: m.group(1) + value, text)


_SETTERS = {"env": _set_env_value, "js": _set_js_value, "yaml": _set_yaml_value}


def _user_value(users, key):
    """Resolve a ``username<N>`` or ``email<N>`` pseudo-key from [users]."""
    m = re.match(r"(username|email)(\d+)$", key)
    if not m:
        return ""
    index = int(m.group(2)) - 1
    add = users.get("add", [])
    if index >= len(add):
        return ""
    username = str(add[index]).strip()
    if m.group(1) == "username":
        return username
    section = users.get(username, {})
    return str(section.get("email", "")).strip() if isinstance(section, dict) else ""


def _toml_lookup(toml_data, source):
    """Resolve a ``section.key`` source string to its value in toml_data."""
    section, _, key = source.partition(".")
    if section == "users":
        return _user_value(toml_data.get("users", {}), key)
    return str(toml_data.get(section, {}).get(key, "")).strip()


def _validate_value(value):
    """Raise ValueError if value contains characters that corrupt config files."""
    if "\n" in value or "\r" in value:
        raise ValueError(f"Config value must not contain newlines: {value!r}")


def _build_entry_values(entries, toml_data):
    """Build the key->value substitution dict for one file's entries."""
    values = {}
    for file_key, source, fmt in entries:
        value = _toml_lookup(toml_data, source)
        if value:
            _validate_value(value)
            values[file_key] = fmt.format(value)
    return values


def build_file_specs(deploy_type, toml_data):
    """Return [(relative path, format, {file key: value})] for deploy_type."""
    specs = []
    for rel_path, file_format, entries in _DEPLOY_FILES.get(deploy_type, []):
        values = _build_entry_values(entries, toml_data)
        if values:
            specs.append((rel_path, file_format, values))
    return specs


def _read_file_text(path):
    """Read a file's text content, returning None on OSError."""
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def _missing_placeholder_warnings(text, rel_path):
    """Return warning strings for any secret placeholders found in text."""
    return [
        f"Warning: '{p}' not substituted in {rel_path}"
        for p in _SECRET_PLACEHOLDERS
        if p in text
    ]


def check_placeholders(dest_dir, specs):
    """Return warnings for known secret placeholders still present after substitution."""
    warnings = []
    for rel_path, _, _ in specs:
        path = Path(dest_dir) / rel_path
        if not path.is_file():
            continue
        text = _read_file_text(path)
        if text is not None:
            warnings.extend(_missing_placeholder_warnings(text, rel_path))
    return warnings


def _apply_to_file(path, file_format, values):
    """Apply key/value substitutions to one config file. Returns error or None."""
    setter = _SETTERS[file_format]
    try:
        raw = path.read_bytes()
        if b"\x00" in raw[:4096]:
            return None
        content = raw.decode("utf-8")
        new_content = content
        for key, value in values.items():
            new_content = setter(new_content, key, value)
        if new_content != content:
            path.write_text(new_content, encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return str(exc)
    return None


def _collect_apply_errors(dest_dir, specs):
    """Apply substitution specs and return a list of error strings."""
    errors = []
    for rel_path, file_format, values in specs:
        path = Path(dest_dir) / rel_path
        if not path.is_file():
            continue
        err = _apply_to_file(path, file_format, values)
        if err:
            errors.append(err)
    return errors


def apply_config(dest_dir, specs):
    """Apply substitution specs to config files under dest_dir.

    Files missing from dest_dir are skipped. Raises OSError on failure.
    """
    errors = _collect_apply_errors(dest_dir, specs)
    if errors:
        raise OSError("\n".join(errors))
