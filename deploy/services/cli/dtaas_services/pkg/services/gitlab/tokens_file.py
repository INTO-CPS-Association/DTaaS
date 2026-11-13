"""Read and update the JSON files under config/ that the GitLab steps keep:
gitlab_tokens.json (the install secrets), gitlab_user_tokens.json (the
users' tokens) and gitlab_user_projects.json (the users' finished projects).

Each file holds one JSON object, is written with mode 0600 through a
temporary file and an atomic rename, and is merged into, never rewritten
from scratch, so an entry saved by an earlier run is never lost. A merge
reads, changes and writes the file while its lock is held (file_lock.py),
so two commands merging at once never lose each other's entries.
"""

import json
from pathlib import Path
from typing import Any, Tuple

from ...config import Config
from ...file_lock import lock_path, locked
from ...utils import explain_permission_error, write_secret_file

TOKENS_FILENAME = "gitlab_tokens.json"
USER_TOKENS_FILENAME = "gitlab_user_tokens.json"


def get_tokens_path() -> Path:
    """Return the path to config/gitlab_tokens.json."""
    return Config.get_base_dir() / "config" / TOKENS_FILENAME


def get_user_tokens_path() -> Path:
    """Return the path to config/gitlab_user_tokens.json."""
    return Config.get_base_dir() / "config" / USER_TOKENS_FILENAME


def read_json_object(path: Path) -> dict[str, Any]:
    """Return the object saved in *path*, or {} when the file does not exist yet.

    Raises:
        OSError: If the file cannot be read (PermissionError with the fix,
            one chown for the file and its lock)
        ValueError: If the file does not hold a JSON object
    """
    if not path.exists():
        return {}
    with explain_permission_error(path, lock_path(path)), path.open(
        "r", encoding="utf-8"
    ) as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise ValueError("expected a JSON object")
    return data


def merge_json_object(path: Path, fields: dict[str, Any]) -> None:
    """Write *fields* into the object saved in *path*, keeping its other
    entries, while the file's lock is held.

    Raises:
        OSError: If the file cannot be read or written, or its lock is held
            by another command for too long (TimeoutError)
        ValueError: If the file does not hold a JSON object
    """
    with locked(path):
        data = read_json_object(path)
        data.update(fields)
        write_secret_file(path, json.dumps(data, indent=2))


def read_saved_tokens(path: Path | None = None) -> Tuple[dict[str, Any], str]:
    """Return the tokens saved in *path* (gitlab_tokens.json by default) and
    an error message ("" on success)."""
    path = path or get_tokens_path()
    try:
        return read_json_object(path), ""
    except (OSError, ValueError) as exc:
        return {}, f"Failed to read {path}: {exc}"


def merge_tokens(fields: dict[str, Any], path: Path | None = None) -> Tuple[bool, str]:
    """Write fields into the tokens file *path* (gitlab_tokens.json by
    default), keeping the entries already saved.

    Each step that makes a secret calls this right away, so a later
    failing step cannot lose it.
    """
    path = path or get_tokens_path()
    try:
        merge_json_object(path, fields)
    except (OSError, ValueError) as exc:
        return False, f"Failed to save tokens to {path}: {exc}"
    return True, f"Tokens saved to {path}"
