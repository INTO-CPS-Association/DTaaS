"""Create GitLab Personal Access Tokens via the admin API."""

import json
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple

import gitlab
import gitlab.exceptions
import httpx

from ...config import Config
from ._api import build_base_url, get_ssl_verify

logger = logging.getLogger(__name__)

PAT_NAME = "dtaas-services"
TOKENS_FILENAME = "gitlab_tokens.json"
USER_PAT_NAME = "dtaas"
USER_PAT_SCOPES = ["api", "read_repository", "write_repository"]
ROOT_USER_ID = 1


def _get_oauth_token(base_url: str, password: str, verify: bool) -> tuple[bool, str]:
    """Get an OAuth access token using root credentials via ROPC grant.

    Args:
        base_url: GitLab instance base URL
        password: Root user password
        verify: Whether to verify SSL certificates

    Returns:
        Tuple of (success, access_token_or_error)
    """
    try:
        resp = httpx.post(
            f"{base_url}/oauth/token",
            data={
                "grant_type": "password",
                "username": "root",
                "password": password,
            },
            verify=verify,
            timeout=30,
        )
    except httpx.RequestError as exc:
        return False, f"OAuth request failed: {exc}"

    if resp.status_code != 200:
        return False, (
            f"OAuth token request failed ({resp.status_code}): {resp.text[:200]}"
        )

    try:
        payload = resp.json()
    except ValueError as exc:
        return False, f"Invalid JSON in OAuth response: {exc}"

    token = payload.get("access_token", "")

    if not token:
        return False, "No access_token in OAuth response"
    return True, token


def _revoke_existing_pats(gl: gitlab.Gitlab, token_name: str) -> None:
    """Revoke all active PATs with the given name for the root user.

    Uses the admin-level personal_access_tokens manager which supports
    listing, unlike the user-scoped manager.

    Args:
        gl: Authenticated gitlab.Gitlab client
        token_name: Name of tokens to revoke
    """
    for pat in gl.personal_access_tokens.list(
        user_id=ROOT_USER_ID, state="active", all=True
    ):
        if pat.name == token_name:
            pat.delete()
            logger.info("Revoked existing PAT: %s", token_name)


def _create_pat_via_api(oauth_token: str) -> tuple[bool, str]:
    """Create a root admin PAT using a temporary OAuth access token.

    Args:
        oauth_token: OAuth access token for the root user

    Returns:
        Tuple of (success, token_or_error)
    """
    expires_at = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
    try:
        url = build_base_url()
        verify = get_ssl_verify()
        gl = gitlab.Gitlab(url, oauth_token=oauth_token, ssl_verify=verify)
        _revoke_existing_pats(gl, PAT_NAME)
        user = gl.users.get(ROOT_USER_ID)
        pat = user.personal_access_tokens.create(
            {"name": PAT_NAME, "scopes": ["api"], "expires_at": expires_at}
        )
        token = pat.token
        if not token:
            return False, "Empty token in PAT API response"
        logger.info("Personal Access Token created successfully.")
        return True, token
    except gitlab.exceptions.GitlabError as exc:
        return False, f"Failed to create PAT via API: {exc}"
    except RuntimeError as exc:
        return False, str(exc)


def _get_oauth_token_with_retry(
    base_url: str, password: str, verify: bool
) -> tuple[bool, str]:
    """Get OAuth token, retrying with new password if initial fails.

    Args:
        base_url: GitLab instance base URL
        password: Initial password to try
        verify: Whether to verify SSL certificates

    Returns:
        Tuple of (success, access_token_or_error)
    """
    success, oauth_token = _get_oauth_token(base_url, password, verify)
    if success:
        return success, oauth_token

    new_password = os.getenv("GITLAB_ROOT_NEW_PASSWORD", "")
    if new_password and new_password != password:
        logger.info(
            "Initial root password rejected; retrying with GITLAB_ROOT_NEW_PASSWORD."
        )
        return _get_oauth_token(base_url, new_password, verify)

    return success, oauth_token


def create_pat(root_password: str) -> tuple[bool, str]:
    """Create a root admin Personal Access Token via the admin API."""
    try:
        base_url = build_base_url()
        verify = get_ssl_verify()
    except RuntimeError as exc:
        return False, str(exc)

    success, oauth_token = _get_oauth_token_with_retry(base_url, root_password, verify)
    if not success:
        return False, f"Failed to obtain OAuth token: {oauth_token}"

    return _create_pat_via_api(oauth_token)


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
