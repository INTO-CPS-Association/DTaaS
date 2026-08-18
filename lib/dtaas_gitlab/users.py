"""GitLab user provisioning: create users and issue Personal Access Tokens."""

import logging
from datetime import datetime, timedelta
from typing import Tuple

import gitlab
import gitlab.exceptions

from .validators import validate_user_row

logger = logging.getLogger(__name__)

USER_PAT_NAME = "dtaas"
USER_PAT_SCOPES = ["api", "read_repository", "write_repository"]
_PAT_EXPIRY_DAYS = 365


def create_user(
    gl: gitlab.Gitlab,
    *,
    username: str,
    email: str,
    password: str,
) -> Tuple[bool, str, int | None]:
    """Create a GitLab user via the admin API after validating inputs.

    Inputs are validated with validate_user_row before any API call. A user
    that already exists (HTTP 409) is treated as success with a user_id of
    None, so callers can distinguish "created" from "already present".

    Args:
        gl: Authenticated gitlab.Gitlab client.
        username: GitLab username (also used as the display name).
        email: User email address.
        password: Initial password.

    Returns:
        Tuple of (success, error_message, user_id_or_None). user_id is None
        when the user already existed.
    """
    is_valid, validation_error = validate_user_row(username, email, password)
    if not is_valid:
        return False, validation_error, None

    payload = {
        "username": username,
        "email": email,
        "password": password,
        "name": username,
        "skip_confirmation": True,
    }
    try:
        user = gl.users.create(payload)
        logger.info("Created GitLab user: %s", username)
        return True, "", user.id
    except gitlab.exceptions.GitlabCreateError as exc:
        if exc.response_code == 409:
            logger.info("GitLab user already exists: %s", username)
            return True, "", None
        return False, f"Failed to create user '{username}': {exc}", None
    except gitlab.exceptions.GitlabError as exc:
        return False, f"Failed to create user '{username}': {exc}", None


def create_user_pat(gl: gitlab.Gitlab, user_id: int, username: str) -> Tuple[bool, str]:
    """Create a Personal Access Token for a GitLab user via the admin API.

    Args:
        gl: Authenticated gitlab.Gitlab client.
        user_id: GitLab user ID.
        username: Username (used in error messages).

    Returns:
        Tuple of (success, token_or_error).
    """
    expires_at = (datetime.now() + timedelta(days=_PAT_EXPIRY_DAYS)).strftime(
        "%Y-%m-%d"
    )
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
