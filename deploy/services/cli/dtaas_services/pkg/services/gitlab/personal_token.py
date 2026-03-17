"""Create GitLab Personal Access Tokens via the Rails console and admin API."""

import json
import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple

import gitlab
import gitlab.exceptions

from ...config import Config
from ...utils import execute_docker_command

logger = logging.getLogger(__name__)

GITLAB_CONTAINER_NAME = "gitlab"
PAT_NAME = "dtaas-services"
TOKENS_FILENAME = "gitlab_tokens.json"
USER_PAT_NAME = "dtaas"
USER_PAT_SCOPES = ["api", "read_repository", "write_repository"]
TOKEN_NAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,100}$")
TOKEN_VALUE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{10,255}$")


def _escape_ruby_single_quoted(value: str) -> str:
    """Escape a string for safe embedding in a Ruby single-quoted literal."""
    return value.replace("\\", "\\\\").replace("'", "\\'")


def _validate_token_name(token_name: str) -> tuple[bool, str]:
    """Validate token names used in the root Rails runner script."""
    if not TOKEN_NAME_PATTERN.fullmatch(token_name):
        return False, (
            "Invalid token name. Allowed characters are letters, digits, dot, "
            "underscore, and hyphen (max length: 100)."
        )
    return True, ""


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
    is_valid, error_message = _validate_token_name(token_name)
    if not is_valid:
        raise ValueError(error_message)

    escaped_token_name = _escape_ruby_single_quoted(token_name)

    return (
        "user = User.find(1); "
        "user.personal_access_tokens.where(name: "
        f"'{escaped_token_name}').each(&:revoke!); "
        "token = user.personal_access_tokens.create!("
        f"name: '{escaped_token_name}', "
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

    if not TOKEN_VALUE_PATTERN.fullmatch(token):
        logger.warning("Token parsing warning: extracted token has an invalid format.")
        return None

    return token


def _execute_rails_command() -> tuple[bool, str]:
    """Execute the gitlab-rails runner command.

    Returns:
        Tuple of (success, output_or_error)
    """
    try:
        script = _build_rails_script(PAT_NAME)
    except ValueError as exc:
        return False, str(exc)

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


def create_user_pat(gl: gitlab.Gitlab, user_id: int, username: str) -> Tuple[bool, str]:
    """Create a Personal Access Token for a GitLab user via the admin API.

    Args:
        gl: Authenticated gitlab.Gitlab client
        user_id: GitLab user ID
        username: Username (for log messages)

    Returns:
        Tuple of (success, token_or_error)
    """
    expires_at = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
    try:
        user = gl.users.get(user_id)
        pat = user.personal_access_tokens.create(
            {
                "name": USER_PAT_NAME,
                "scopes": USER_PAT_SCOPES,
                "expires_at": expires_at,
            }
        )
        token = pat.token
        if not token:
            return False, f"Empty token in PAT response for '{username}'"
        return True, token
    except gitlab.exceptions.GitlabError as exc:
        return False, f"Failed to create PAT for '{username}': {exc}"
