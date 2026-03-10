"""GitLab user management via the REST API."""

import csv
import json
import logging
from pathlib import Path
from typing import Tuple

from ...config import Config
from ...utils import get_credentials_path
from ._api import gitlab_request

logger = logging.getLogger(__name__)

TOKENS_FILENAME = "gitlab_tokens.json"
USERS_ENDPOINT = "/users"


def _get_tokens_path() -> Path:
    """Return the path to the saved GitLab tokens file.

    Returns:
        Path to config/gitlab_tokens.json
    """
    base_dir = Config.get_base_dir()
    return base_dir / "config" / TOKENS_FILENAME


def _read_tokens_file(tokens_path: Path) -> Tuple[bool, str]:
    """Read and extract the PAT from a tokens JSON file.

    Args:
        tokens_path: Path to the JSON file

    Returns:
        Tuple of (success, pat_or_error)
    """
    try:
        with tokens_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        pat = data.get("personal_access_token", "")
        if not pat:
            return False, "personal_access_token is empty in token file."
        return True, pat
    except (OSError, json.JSONDecodeError, KeyError) as exc:
        return False, f"Failed to read token file: {exc}"


def _load_pat_from_tokens() -> Tuple[bool, str]:
    """Load the Personal Access Token from the tokens file.

    The tokens file is created by ``dtaas-services install -s gitlab``.

    Returns:
        Tuple of (success, pat_or_error)
    """
    tokens_path = _get_tokens_path()

    if not tokens_path.exists():
        return False, (
            f"Token file not found: {tokens_path}\n"
            "Run 'dtaas-services install -s gitlab' first."
        )

    return _read_tokens_file(tokens_path)


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


def _evaluate_user_response(response, username: str) -> Tuple[bool, str]:
    """Evaluate the API response after a user-creation request.

    Args:
        response: httpx Response object
        username: GitLab username (for log messages)

    Returns:
        Tuple of (success, error_message)
    """
    if response.status_code == 201:
        logger.info("Created GitLab user: %s", username)
        return True, ""

    if response.status_code == 409:
        logger.info("GitLab user already exists: %s", username)
        return True, ""

    return False, (
        f"Failed to create user '{username}': "
        f"HTTP {response.status_code}: {response.text}"
    )


def _create_single_user(pat: str, row: dict) -> Tuple[bool, str]:
    """Create one GitLab user via the REST API.

    Args:
        pat: Personal Access Token for authentication
        row: Dict with keys 'username', 'email', 'password' from the CSV
    Returns:
        Tuple of (success, error_message)
    """
    username = row.get("username", "").strip()
    email = row.get("email", "").strip()
    password = row.get("password", "").strip()
    payload = _build_user_payload(username, email, password)
    http_params = {"method": "POST", "endpoint": USERS_ENDPOINT}
    success, response, error_msg = gitlab_request(http_params, pat, json=payload)

    if not success:
        return False, f"Failed to create user '{username}': {error_msg}"

    return _evaluate_user_response(response, username)


def _create_users_from_rows(pat: str, reader) -> Tuple[bool, str]:
    """Create GitLab users for each row yielded by a CSV DictReader.

    Args:
        pat: Personal Access Token
        reader: csv.DictReader iterator with username/email/password columns

    Returns:
        Tuple of (success, error_message)
    """
    for row in reader:
        success, error_msg = _create_single_user(pat, row)
        if not success:
            return False, error_msg
    return True, ""


def _process_credentials(pat: str, creds_path: Path) -> Tuple[bool, str]:
    """Read credentials.csv and create a GitLab user for each row.

    Args:
        pat: Personal Access Token
        creds_path: Path to the credentials CSV file

    Returns:
        Tuple of (success, error_message)
    """
    try:
        with creds_path.open("r", newline="", encoding="utf-8") as fh:
            return _create_users_from_rows(pat, csv.DictReader(fh, delimiter=","))
    except (OSError, KeyError, ValueError) as exc:
        return False, f"Error reading credentials file: {exc}"


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
    """Add users to GitLab from the credentials CSV.

    Returns:
        Tuple of (success, message)
    """
    Config()
    success, pat_or_error, creds_path = _load_gitlab_prerequisites()
    if not success:
        return False, pat_or_error

    success, error_msg = _process_credentials(pat_or_error, creds_path)
    if not success:
        return False, error_msg

    return True, "GitLab users created successfully"
