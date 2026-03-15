"""GitLab user management via the REST API."""

import csv
import logging
from pathlib import Path
from typing import Tuple
import json
from ...config import Config
from ...utils import get_credentials_path
from ._api import gitlab_request
from .personal_token import _load_pat_from_tokens, create_user_pat

logger = logging.getLogger(__name__)

USER_TOKENS_FILENAME = "gitlab_user_tokens.json"
USERS_ENDPOINT = "/users"


def _build_user_payload(username: str, email: str, password: str) -> dict:
    """Build the JSON payload for creating a GitLab user.

    Args:
        username: GitLab username
        email: User email address
        password: User password (min 8 characters)

    Returns:
        Dict ready for POST /api/v4/users
    """
    return {
        "username": username,
        "email": email,
        "password": password,
        "name": username,
        "skip_confirmation": True,
    }


def _evaluate_user_response(response, username: str) -> Tuple[bool, int | None, str]:
    """Evaluate the API response after a user-creation request.

    Args:
        response: httpx Response object
        username: GitLab username (for log messages)

    Returns:
        Tuple of (success, user_id_or_None, error_message)
    """
    if response.status_code == 201:
        logger.info("Created GitLab user: %s", username)
        try:
            user_id = response.json().get("id")
        except json.JSONDecodeError:
            user_id = None
        return True, user_id, ""

    if response.status_code == 409:
        logger.info("GitLab user already exists: %s", username)
        return True, None, ""

    return (
        False,
        None,
        (
            f"Failed to create user '{username}': "
            f"HTTP {response.status_code}: {response.text}"
        ),
    )


def _create_user_and_pat(admin_pat: str, row: dict) -> Tuple[bool, str, str]:
    """Create a user and, if newly created, their Personal Access Token.

    Args:
        admin_pat: Admin Personal Access Token
        row: CSV row dict with username/email/password keys

    Returns:
        Tuple of (success, error_msg, pat_token_or_empty)
    """
    username = row.get("username", "").strip()
    success, error, user_id = _create_single_user(admin_pat, row)
    if not success:
        return False, error, ""
    if user_id is None:
        # User already existed, skip PAT creation
        return True, "", ""
    success, token_or_error = create_user_pat(admin_pat, user_id, username)
    if not success:
        return False, token_or_error, ""
    return True, "", token_or_error


def _create_single_user(pat: str, row: dict) -> Tuple[bool, str, int | None]:
    """Create one GitLab user via the REST API.

    Args:
        pat: Personal Access Token for authentication
        row: Dict with keys 'username', 'email', 'password' from the CSV
    Returns:
        Tuple of (success, error_message, user_id_or_None)
    """
    username = row.get("username", "").strip()
    email = row.get("email", "").strip()
    password = row.get("password", "").strip()
    payload = _build_user_payload(username, email, password)
    http_params = {"method": "POST", "endpoint": USERS_ENDPOINT}
    success, response, error_msg = gitlab_request(http_params, pat, json=payload)

    if not success:
        return False, f"Failed to create user '{username}': {error_msg}", None

    success, user_id, error = _evaluate_user_response(response, username)
    return success, error, user_id


def _create_users_from_rows(pat: str, reader) -> Tuple[bool, str, dict[str, str]]:
    """Create GitLab users and PATs for each row yielded by a CSV DictReader.

    Args:
        pat: Admin Personal Access Token
        reader: csv.DictReader iterator with username/email/password columns

    Returns:
        Tuple of (success, error_message, tokens_dict)
    """
    tokens: dict[str, str] = {}
    for row in reader:
        username = row.get("username", "").strip()
        success, error_msg, token = _create_user_and_pat(pat, row)
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
            import json

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
    pat: str, creds_path: Path
) -> Tuple[bool, str, dict[str, str]]:
    """Read credentials.csv and create a GitLab user and PAT for each row.

    Args:
        pat: Admin Personal Access Token
        creds_path: Path to the credentials CSV file

    Returns:
        Tuple of (success, error_message, tokens_dict)
    """
    try:
        with creds_path.open("r", newline="", encoding="utf-8") as fh:
            return _create_users_from_rows(pat, csv.DictReader(fh, delimiter=","))
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

    success, error_msg, tokens = _process_credentials(pat_or_error, creds_path)
    if not success:
        return False, error_msg

    return _finalize_user_tokens(tokens)
