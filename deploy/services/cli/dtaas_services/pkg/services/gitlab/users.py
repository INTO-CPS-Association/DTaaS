"""GitLab user management via the python-gitlab library."""

import csv
import json
import logging
import re
from pathlib import Path
from typing import Tuple

import gitlab
import gitlab.exceptions

from ...config import Config
from ...utils import get_credentials_path
from ._api import get_gitlab_client
from .personal_token import _load_pat_from_tokens, create_user_pat

logger = logging.getLogger(__name__)

USER_TOKENS_FILENAME = "gitlab_user_tokens.json"
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_username(username: str) -> str | None:
    """Validate username input."""
    if not username:
        return "Invalid user input: username is required."
    if not USERNAME_PATTERN.fullmatch(username):
        return "Invalid user input: username contains invalid characters or length."
    return None


def _validate_email(email: str) -> str | None:
    """Validate email input."""
    if not email:
        return "Invalid user input: email is required."
    if len(email) > 50 or not EMAIL_PATTERN.fullmatch(email):
        return "Invalid user input: email format is invalid."
    return None


def _validate_password(password: str) -> str | None:
    """Validate password input."""
    if not password:
        return "Invalid user input: password is required."
    if len(password) > 55 or any(ord(char) < 32 for char in password):
        return "Invalid user input: password format is invalid."
    return None


def _validate_user_row(username: str, email: str, password: str) -> Tuple[bool, str]:
    """Validate user inputs before calling the GitLab API."""
    validation_error = next(
        (
            error
            for error in (
                _validate_username(username),
                _validate_email(email),
                _validate_password(password),
            )
            if error
        ),
        "",
    )
    if validation_error:
        return False, validation_error
    return True, ""


def _create_single_user(gl: gitlab.Gitlab, row: dict) -> Tuple[bool, str, int | None]:
    """Create one GitLab user via the python-gitlab library.

    Args:
        gl: Authenticated gitlab.Gitlab client
        row: Dict with keys 'username', 'email', 'password' from the CSV

    Returns:
        Tuple of (success, error_message, user_id_or_None)
    """
    username = (row.get("username") or "").strip()
    email = (row.get("email") or "").strip()
    password = (row.get("password") or "").strip()

    is_valid, validation_error = _validate_user_row(username, email, password)
    if not is_valid:
        return False, validation_error, None

    try:
        user = gl.users.create(
            {
                "username": username,
                "email": email,
                "password": password,
                "name": username,
                "skip_confirmation": True,
            }
        )
        logger.info("Created GitLab user: %s", username)
        return True, "", user.id
    except gitlab.exceptions.GitlabCreateError as exc:
        if exc.response_code == 409:
            logger.info("GitLab user already exists: %s", username)
            return True, "", None
        return False, f"Failed to create user '{username}': {exc}", None
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


def _create_users_from_rows(
    gl: gitlab.Gitlab, reader
) -> Tuple[bool, str, dict[str, str]]:
    """Create GitLab users and PATs for each row yielded by a CSV DictReader.

    Args:
        gl: Authenticated gitlab.Gitlab client
        reader: csv.DictReader iterator with username/email/password columns

    Returns:
        Tuple of (success, error_message, tokens_dict)
    """
    tokens: dict[str, str] = {}
    for row in reader:
        username = (row.get("username") or "").strip()
        success, error_msg, token = _create_user_and_pat(gl, row)
        if not success:
            return False, error_msg, {}
        if token:
            tokens[username] = token
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
        tokens_path.parent.mkdir(parents=True, exist_ok=True)
        with tokens_path.open("w", encoding="utf-8") as fh:
            json.dump(tokens, fh, indent=2)
        return True, str(tokens_path)
    except OSError as exc:
        return False, f"Failed to save user tokens: {exc}"


def _finalize_user_tokens(tokens: dict[str, str]) -> Tuple[bool, str]:
    """Save user tokens if any were created and return the final message.

    Returns:
        Tuple of (success, message)
    """
    if not tokens:
        return True, "GitLab users created successfully"
    tokens_path = _get_user_tokens_path()
    ok, save_msg = _save_user_tokens(tokens, tokens_path)
    if not ok:
        return False, save_msg
    return True, f"GitLab users created successfully. Tokens saved to {save_msg}"


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
    if not success:
        return False, error_msg

    return _finalize_user_tokens(tokens)
