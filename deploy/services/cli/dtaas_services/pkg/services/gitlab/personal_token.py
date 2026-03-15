"""Create GitLab Personal Access Tokens via the Rails console and admin API."""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple

from ...config import Config
from ...utils import execute_docker_command
from ._api import gitlab_request

logger = logging.getLogger(__name__)

GITLAB_CONTAINER_NAME = "gitlab"
PAT_NAME = "dtaas-services"
TOKENS_FILENAME = "gitlab_tokens.json"
USER_PAT_NAME = "dtaas"
USER_PAT_SCOPES = ["api", "read_repository", "write_repository"]


def _build_rails_script(token_name: str) -> str:
    """Build the Ruby script that creates a Personal Access Token.

    The script:
    1. Finds the root user (admin, User ID 1)
    2. Revokes any existing token with the same name
    3. Creates a new PersonalAccessToken with ``api`` scope
    4. Prints ONLY the token value to stdout

    Args:
        token_name: Display name for the token

    Returns:
        Ruby script as a string
    """
    return (
        "user = User.find(1); "
        f"user.personal_access_tokens.where(name: '{token_name}').each(&:revoke!); "
        "token = user.personal_access_tokens.create!("
        f"name: '{token_name}', "
        "scopes: ['api'], "
        "expires_at: 365.days.from_now"
        "); "
        "puts token.token"
    )


def _parse_token_from_output(output: str) -> str | None:
    """Extract the token string from rails runner output.

    Args:
        output: Raw stdout from gitlab-rails runner

    Returns:
        Token string or None if parsing fails
    """
    lines = [line.strip() for line in output.strip().splitlines() if line.strip()]
    if not lines:
        return None

    token = lines[-1]

    if len(token) < 10:
        logger.warning(
            f"Token parsing warning: extracted token is too short: '{token}'"
        )
        return None

    return token


def _execute_rails_command() -> tuple[bool, str]:
    """Execute the gitlab-rails runner command.

    Returns:
        Tuple of (success, output_or_error)
    """
    script = _build_rails_script(PAT_NAME)
    cmd = ["gitlab-rails", "runner", script]

    logger.info("Creating Personal Access Token via gitlab-rails runner...")

    return execute_docker_command(GITLAB_CONTAINER_NAME, cmd, verbose=False)


def _extract_and_validate_token(output: str) -> tuple[bool, str]:
    """Extract and validate the token from command output.

    Args:
        output: Raw output from the rails command

    Returns:
        Tuple of (success, token_or_error)
    """
    token = _parse_token_from_output(output)
    if token is None:
        return False, (
            "Could not parse token from gitlab-rails output. "
            f"Raw output: {output[:200]}"
        )
    logger.info("Personal Access Token created successfully.")
    return True, token


def create_personal_access_token() -> tuple[bool, str]:
    """Create a Personal Access Token for the GitLab root user.

    Returns:
        Tuple of (success, token_or_error_message)
    """
    success, output = _execute_rails_command()

    if not success:
        return False, f"Failed to create Personal Access Token: {output}"

    return _extract_and_validate_token(output)


def _get_tokens_path() -> Path:
    """Return the path to the saved GitLab admin tokens file."""
    return Config.get_base_dir() / "config" / TOKENS_FILENAME


def _read_tokens_file(tokens_path: Path) -> Tuple[bool, str]:
    """Read and extract the admin PAT from a tokens JSON file.

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
    """Load the admin Personal Access Token from the install-time tokens file.

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


def _parse_user_pat_response(response, username: str) -> Tuple[bool, str]:
    """Parse the API response from a user PAT creation request.

    Returns:
        Tuple of (success, token_or_error)
    """
    if response.status_code not in (200, 201):
        return False, (
            f"Failed to create PAT for '{username}': "
            f"HTTP {response.status_code}: {response.text}"
        )
    try:
        token = response.json().get("token", "")
        if not token:
            return False, f"Empty token in PAT response for '{username}'"
        return True, token
    except (KeyError, json.JSONDecodeError) as exc:
        return False, f"Failed to parse PAT response for '{username}': {exc}"


def create_user_pat(admin_pat: str, user_id: int, username: str) -> Tuple[bool, str]:
    """Create a Personal Access Token for a GitLab user via the admin API.

    Args:
        admin_pat: Admin Personal Access Token
        user_id: GitLab user ID
        username: Username (for log messages)

    Returns:
        Tuple of (success, token_or_error)
    """
    expires_at = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
    payload = {
        "name": USER_PAT_NAME,
        "scopes": USER_PAT_SCOPES,
        "expires_at": expires_at,
    }
    http_params = {
        "method": "POST",
        "endpoint": f"/users/{user_id}/personal_access_tokens",
    }
    success, response, error_msg = gitlab_request(http_params, admin_pat, json=payload)
    if not success:
        return False, f"Failed to create PAT for '{username}': {error_msg}"
    return _parse_user_pat_response(response, username)
