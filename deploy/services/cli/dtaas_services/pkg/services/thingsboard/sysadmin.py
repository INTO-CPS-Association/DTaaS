"""ThingsBoard admin operations, sysadmin password and tenant management."""

# pylint: disable=W1203, R0903
import logging
import os
from typing import Tuple
import httpx
from .tb_utility import login, is_json_parse_error
from ...password_store import get_current_password, save_password

logger = logging.getLogger(__name__)

DEFAULT_SYSADMIN_PASSWORD = "sysadmin"  # noqa: S105 # NOSONAR
SYSADMIN_PW_KEY = "TB_SYSADMIN_CURRENT_PASSWORD"


def _update_session_token(session: httpx.Client, token: str) -> None:
    """Update session with authorization token."""
    session.headers["X-Authorization"] = f"Bearer {token}"


def _build_sysadmin_password_candidates() -> list[str]:
    """Build ordered list of password candidates for sysadmin login."""
    stored = get_current_password(SYSADMIN_PW_KEY)
    new_pw = os.getenv("TB_SYSADMIN_NEW_PASSWORD", "")
    candidates = [stored, new_pw, DEFAULT_SYSADMIN_PASSWORD]
    return [pw for pw in candidates if pw]


def authenticate_session(base_url: str, session: httpx.Client) -> Tuple[bool, str]:
    """Authenticate the session as sysadmin.

    Tries stored password, configured password, then default.

    Args:
        base_url: ThingsBoard base URL
        session: HTTP session to authenticate

    Returns:
        Tuple of (success, error_message)
    """
    sys_email = os.getenv("TB_SYSADMIN_EMAIL", "")
    for pw in _build_sysadmin_password_candidates():
        token = login(base_url, sys_email, pw)
        if token:
            _update_session_token(session, token)
            return True, ""

    return False, (
        "Failed to authenticate as ThingsBoard sysadmin. "
        "Verify ThingsBoard is running and TB_SYSADMIN_EMAIL / "
        "TB_SYSADMIN_NEW_PASSWORD in config/services.env are correct."
    )


class _PasswordConfig:
    """Password configuration for change operations."""

    def __init__(self, default_pw: str, new_pw: str):
        self.default_pw = default_pw
        self.new_pw = new_pw


class _PasswordChangeContext:
    """Context for password change operations."""

    def __init__(
        self, base_url: str, session: httpx.Client, pw_config: _PasswordConfig
    ):
        self.base_url = base_url
        self.session = session
        self.default_pw = pw_config.default_pw
        self.new_pw = pw_config.new_pw


def parse_tb_password_error(resp: httpx.Response) -> str:
    """Extract error from a ThingsBoard password-change response."""
    try:
        body = resp.json()
        msg = body.get("message", "")
        if "same" in msg.lower():
            return "New password is the same as the current password."
        if "short" in msg.lower() or "weak" in msg.lower():
            return f"Password rejected: {msg}"
        return msg or f"HTTP {resp.status_code}"
    except Exception:
        return f"HTTP {resp.status_code}: {resp.text[:200]}"


def _change_password_api_call(ctx: _PasswordChangeContext) -> Tuple[bool, str]:
    """Call API to change password.

    Returns:
        Tuple of (success, error_detail)
    """
    url = f"{ctx.base_url}/api/auth/changePassword"
    try:
        resp = ctx.session.post(
            url,
            json={"currentPassword": ctx.default_pw, "newPassword": ctx.new_pw},
            timeout=10,
        )
        if resp.status_code == 200:
            logger.info("Sysadmin password changed successfully.")
            save_password(SYSADMIN_PW_KEY, ctx.new_pw)
            return True, ""
        detail = parse_tb_password_error(resp)
        logger.error(f"Failed to change sysadmin password: {detail}")
        return False, detail
    except httpx.HTTPError as e:
        logger.error(f"Network error during password change: {e}")
        return False, f"Network error: {e}"


def _perform_password_change(ctx: _PasswordChangeContext) -> Tuple[bool, str]:
    """Perform the password change operation."""
    logger.info("Changing sysadmin password to new value...")
    return _change_password_api_call(ctx)


def _handle_successful_login(
    session: httpx.Client, token: str, ctx: _PasswordChangeContext
) -> Tuple[bool, str]:
    """Handle a successful login during password change."""
    if ctx.default_pw == ctx.new_pw:
        logger.info("Sysadmin already uses the new password. No change needed.")
        save_password(SYSADMIN_PW_KEY, ctx.new_pw)
        return True, "Password already updated"
    _update_session_token(session, token)
    return _perform_password_change(ctx)


def change_sysadmin_password(
    base_url: str,
    session: httpx.Client,
    new_pw: str,
) -> Tuple[bool, str]:
    """Change the sysadmin password.
    Tries stored password, then the platform default ("sysadmin").
    """
    sys_email = os.getenv("TB_SYSADMIN_EMAIL", "")
    candidates = _build_sysadmin_password_candidates()

    for current_pw in candidates:
        token = login(base_url, sys_email, current_pw)
        if token:
            pw_config = _PasswordConfig(current_pw, new_pw)
            ctx = _PasswordChangeContext(base_url, session, pw_config)
            return _handle_successful_login(session, token, ctx)

    return False, (
        "Failed to get authentication token for sysadmin. "
        "Verify the configuration in config/services.env."
    )


def _find_tenant_in_response(body: dict, tenant_name: str) -> dict | None:
    """Find tenant by name in response body."""
    for tenant in body.get("data", []):
        if tenant.get("title") == tenant_name:
            logger.info(f"  Tenant '{tenant_name}' already exists")
            return tenant
    return None


def _check_existing_tenant(
    params: dict, base_url: str, session: httpx.Client
) -> Tuple[dict | None, str]:
    """Check if tenant already exists."""
    try:
        resp = session.get(f"{base_url}/api/tenants", params=params, timeout=20)
        if resp.status_code != 200:
            return None, f"Failed to get tenants: {resp.status_code}"

        body = resp.json()
        tenant_name = params.get("textSearch", "")
        return _find_tenant_in_response(body, tenant_name), ""
    except Exception as e:
        error_type = "Invalid JSON" if is_json_parse_error(e) else "Network error"
        return None, f"{error_type} checking tenant: {e}"


def _create_new_tenant(
    base_url: str, session: httpx.Client, tenant_name: str
) -> Tuple[dict | None, str]:
    """Create a new tenant."""
    logger.info(f"  Creating tenant '{tenant_name}'...")
    create_payload = {"title": tenant_name}
    try:
        resp = session.post(f"{base_url}/api/tenant", json=create_payload, timeout=20)

        if resp.status_code not in (200, 201):
            return None, f"Failed to create tenant: {resp.status_code}"

        tenant = resp.json()
        logger.info(f"  Tenant '{tenant_name}' created")
        return tenant, ""
    except Exception as e:
        error_type = "Invalid JSON" if is_json_parse_error(e) else "Network error"
        return None, f"{error_type} creating tenant: {e}"


def get_or_create_tenant(
    base_url: str, session: httpx.Client, tenant_name: str
) -> Tuple[dict | None, str]:
    """Get existing tenant or create a new one."""
    try:
        params = {"pageSize": 100, "page": 0, "textSearch": tenant_name}
        tenant, error_msg = _check_existing_tenant(params, base_url, session)

        if error_msg:
            return None, error_msg

        # Return existing tenant or create new one
        return (
            (tenant, "")
            if tenant
            else _create_new_tenant(base_url, session, tenant_name)
        )
    except Exception as e:
        return None, f"Exception getting/creating tenant: {e}"
