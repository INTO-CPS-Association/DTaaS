"""GitLab user management via the python-gitlab library."""

import csv
import json
import logging
from pathlib import Path
from typing import Tuple

import gitlab
import gitlab.exceptions

from ...config import Config
from ...utils import get_credentials_path, write_secret_file
from ._api import get_gitlab_client
from .validators import validate_user_row
from .personal_token import _load_pat_from_tokens, create_user_pat

logger = logging.getLogger(__name__)

USER_TOKENS_FILENAME = "gitlab_user_tokens.json"


def _extract_and_validate_user_fields(row: dict) -> Tuple[bool, str, dict]:
    """Extract and validate CSV user fields, returning API payload on success."""
    username = (row.get("username") or "").strip()
    email = (row.get("email") or "").strip()
    password = (row.get("password") or "").strip()

    is_valid, validation_error = validate_user_row(username, email, password)
    if not is_valid:
        return False, validation_error, {}

    return (
        True,
        "",
        {
            "username": username,
            "email": email,
            "password": password,
            "name": username,
            "skip_confirmation": True,
        },
    )


def _handle_gitlab_create_error(
    username: str, exc: gitlab.exceptions.GitlabCreateError
) -> Tuple[bool, str, int | None]:
    """Map GitLab create-user API errors to CLI return contract."""
    if exc.response_code == 409:
        logger.info("GitLab user already exists: %s", username)
        return True, "", None
    return False, f"Failed to create user '{username}': {exc}", None


def _create_single_user(gl: gitlab.Gitlab, row: dict) -> Tuple[bool, str, int | None]:
    """Create one GitLab user via the python-gitlab library.

    Args:
        gl: Authenticated gitlab.Gitlab client
        row: Dict with keys 'username', 'email', 'password' from the CSV

    Returns:
        Tuple of (success, error_message, user_id_or_None)
    """
    is_valid, validation_error, payload = _extract_and_validate_user_fields(row)
    if not is_valid:
        return False, validation_error, None

    username = payload["username"]

    try:
        user = gl.users.create(payload)
        logger.info("Created GitLab user: %s", username)
        return True, "", user.id
    except gitlab.exceptions.GitlabCreateError as exc:
        return _handle_gitlab_create_error(username, exc)
    except gitlab.exceptions.GitlabError as exc:
        return False, f"Failed to create user '{username}': {exc}", None


def _create_user_and_pat(gl: gitlab.Gitlab, row: dict) -> Tuple[bool, str, str]:
    """Create a user and, if newly created, their Personal Access Token.

    Args:
        gl: Authenticated gitlab.Gitlab client
        row: CSV row dict with username/email/password keys

    Returns:
        Tuple of (success, error_msg, pat_token_or_empty)
    """
    username = (row.get("username") or "").strip()
    success, error, user_id = _create_single_user(gl, row)
    if not success:
        return False, error, ""
    if user_id is None:
        return True, "", ""
    success, token_or_error = create_user_pat(gl, user_id, username)
    if not success:
        return False, token_or_error, ""
    return True, "", token_or_error


def _process_user_row(
    gl: gitlab.Gitlab, row: dict, tokens: dict[str, str]
) -> Tuple[bool, str]:
    """Create user/PAT for one row and update tokens dict when present."""
    username = (row.get("username") or "").strip()
    success, error_msg, token = _create_user_and_pat(gl, row)
    if not success:
        return False, error_msg
    if token:
        tokens[username] = token
    return True, ""


def _create_users_from_rows(
    gl: gitlab.Gitlab, reader
) -> Tuple[bool, str, dict[str, str]]:
    """Create GitLab users and PATs for each row yielded by a CSV DictReader.

    Processes every row regardless of individual failures so that successful
    tokens are never lost.  Per-row errors are collected and returned as a
    newline-joined summary.

    Args:
        gl: Authenticated gitlab.Gitlab client
        reader: csv.DictReader iterator with username/email/password columns

    Returns:
        Tuple of (all_succeeded, error_summary_or_empty, tokens_dict)
    """
    tokens: dict[str, str] = {}
    errors: list[str] = []
    for row in reader:
        success, error_msg = _process_user_row(gl, row, tokens)
        if not success:
            username = (row.get("username") or "").strip() or "<unknown>"
            errors.append(f"{username}: {error_msg}")
    if errors:
        return False, "\n".join(errors), tokens
    return True, "", tokens


def _get_user_tokens_path() -> Path:
    """Return path to config/gitlab_user_tokens.json."""
    base_dir = Config.get_base_dir()
    return base_dir / "config" / USER_TOKENS_FILENAME


def _save_user_tokens(tokens: dict[str, str], tokens_path: Path) -> Tuple[bool, str]:
    """Save user PATs to a JSON file.

    Returns:
        Tuple of (success, path_or_error_message)
    """
    try:
        write_secret_file(tokens_path, json.dumps(tokens, indent=2))
        return True, str(tokens_path)
    except OSError as exc:
        return False, f"Failed to save user tokens: {exc}"


def _finalize_user_tokens(
    tokens: dict[str, str], error_summary: str = ""
) -> Tuple[bool, str]:
    """Save user tokens (if any) and build the final status message.

    Tokens are persisted even when some rows failed so that already-created
    PATs are not lost.

    Returns:
        Tuple of (success, message)
    """
    save_ok = True
    save_msg = ""
    if tokens:
        tokens_path = _get_user_tokens_path()
        save_ok, save_msg = _save_user_tokens(tokens, tokens_path)
        if not save_ok:
            return False, save_msg
        save_msg = f" Tokens saved to {save_msg}"

    if error_summary:
        base = f"GitLab users partially created.{save_msg}"
        return False, f"{base}\nErrors:\n{error_summary}"

    return True, f"GitLab users created successfully.{save_msg}".rstrip(".")


def _process_credentials(
    gl: gitlab.Gitlab, creds_path: Path
) -> Tuple[bool, str, dict[str, str]]:
    """Read credentials.csv and create a GitLab user and PAT for each row.

    Args:
        gl: Authenticated gitlab.Gitlab client
        creds_path: Path to the credentials CSV file

    Returns:
        Tuple of (success, error_message, tokens_dict)
    """
    try:
        with creds_path.open("r", newline="", encoding="utf-8") as fh:
            return _create_users_from_rows(gl, csv.DictReader(fh, delimiter=","))
    except (OSError, KeyError, ValueError) as exc:
        return False, f"Error reading credentials file: {exc}", {}


def _load_gitlab_prerequisites() -> Tuple[bool, str, Path]:
    """Load the PAT and locate the credentials file.

    Returns:
        Tuple of (success, pat_or_error, creds_path)
    """
    success, pat = _load_pat_from_tokens()
    if not success:
        return False, pat, Path()

    creds_path = get_credentials_path()
    if not creds_path.exists():
        return False, f"Credentials file not found: {creds_path}", Path()

    return True, pat, creds_path


def setup_gitlab_users() -> Tuple[bool, str]:
    """Add users to GitLab from the credentials CSV and create their PATs.

    Returns:
        Tuple of (success, message)
    """
    Config()
    success, pat_or_error, creds_path = _load_gitlab_prerequisites()
    if not success:
        return False, pat_or_error

    gl = get_gitlab_client(pat_or_error)
    success, error_msg, tokens = _process_credentials(gl, creds_path)
    return _finalize_user_tokens(tokens, error_msg)
