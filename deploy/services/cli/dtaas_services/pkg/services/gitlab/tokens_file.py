"""Read and update config/gitlab_tokens.json, the GitLab install secrets."""

import json
from pathlib import Path
from typing import Any, Tuple

from ...config import Config
from ...utils import write_secret_file

TOKENS_FILENAME = "gitlab_tokens.json"


def get_tokens_path() -> Path:
    """Return the path to config/gitlab_tokens.json."""
    return Config.get_base_dir() / "config" / TOKENS_FILENAME


def _read_tokens(path: Path) -> dict[str, Any]:
    """Return the saved tokens, or {} when the file does not exist yet.

    Raises:
        OSError: If the file cannot be read
        ValueError: If the file does not hold a JSON object
    """
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise ValueError("expected a JSON object")
    return data


def read_saved_tokens() -> Tuple[dict[str, Any], str]:
    """Return the saved tokens and an error message ("" on success)."""
    path = get_tokens_path()
    try:
        return _read_tokens(path), ""
    except (OSError, ValueError) as exc:
        return {}, f"Failed to read {path}: {exc}"


def merge_tokens(fields: dict[str, Any]) -> Tuple[bool, str]:
    """Write fields into the tokens file, keeping the entries already saved.

    Each install step that makes a secret calls this right away, so a later
    failing step cannot lose it.
    """
    path = get_tokens_path()
    try:
        data = _read_tokens(path)
        data.update(fields)
        write_secret_file(path, json.dumps(data, indent=2))
    except (OSError, ValueError) as exc:
        return False, f"Failed to save tokens to {path}: {exc}"
    return True, f"Tokens saved to {path}"
