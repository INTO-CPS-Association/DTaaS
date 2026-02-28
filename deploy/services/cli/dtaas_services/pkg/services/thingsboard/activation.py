"""Shared user activation utilities for ThingsBoard."""

# pylint: disable=W1203
import logging
from typing import Tuple
from urllib.parse import urlparse, parse_qs
import httpx
from .tb_utility import get_ssl_verify

logger = logging.getLogger(__name__)


def _extract_token_from_link(link_text: str) -> Tuple[str | None, str]:
    """Extract activation token from activation link URL."""
    activation_link = link_text.strip().strip('"')
    parsed = urlparse(activation_link)
    qs = parse_qs(parsed.query)
    tokens = qs.get("activateToken") or qs.get("activatetoken")
    if tokens:
        return tokens[0], ""
    return None, "Could not extract activateToken from activation link"


def get_activation_token(
    base_url: str, session: httpx.Client, user_id: str
) -> Tuple[str | None, str]:
    """Get activation token for a user.

    Args:
        base_url: ThingsBoard base URL
        session: Authenticated HTTP session
        user_id: User ID to get activation token for

    Returns:
        Tuple of (token or None, error_message)
    """
    try:
        resp = session.get(f"{base_url}/api/user/{user_id}/activationLink", timeout=10)
        if resp.status_code != 200:
            return None, f"Failed to get activation link: {resp.status_code}"
        return _extract_token_from_link(resp.text)
    except httpx.HTTPError as e:
        return None, f"Network error getting activation token: {e}"


def _is_ssl_error(error_str: str) -> bool:
    """Check if error string indicates an SSL-related error."""
    lower = error_str.lower()
    return "certificate verify failed" in lower or "ssl" in lower


def _handle_activate_error(exc: httpx.HTTPError) -> Tuple[bool, str]:
    """Handle activation HTTP error based on type."""
    if _is_ssl_error(str(exc)):
        return False, f"SSL certificate verification failed: {exc}"
    return False, f"Network error activating user: {exc}"


def activate_user(
    base_url: str, activate_token: str, password: str
) -> Tuple[bool, str]:
    """Activate a user account with the given password.

    Args:
        base_url: ThingsBoard base URL
        activate_token: User activation token
        password: Password to set for the user

    Returns:
        Tuple of (success, error_message)
    """
    payload = {"activateToken": activate_token, "password": password}
    try:
        resp = httpx.post(
            f"{base_url}/api/noauth/activate",
            json=payload,
            timeout=15,
            verify=get_ssl_verify(),
        )
        if resp.status_code != 200:
            return False, f"Failed to activate user: {resp.status_code}"
        return True, ""
    except httpx.HTTPError as e:
        return _handle_activate_error(e)
