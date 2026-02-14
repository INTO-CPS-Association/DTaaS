"""ThingsBoard admin operations - sysadmin password and tenant management."""

# pylint: disable=W1203, R0903
import logging
from typing import Tuple
import httpx
from .tb_utility import login

logger = logging.getLogger(__name__)


def _try_login_with_new_password(base_url: str, email: str, new_pw: str) -> str | None:
    """Try logging in with new password."""
    logger.info("Attempting login as sysadmin with new password...")
    return login(base_url, email, new_pw)


def _update_session_token(session: httpx.Client, token: str) -> None:
    """Update session with authorization token."""
    session.headers["X-Authorization"] = f"Bearer {token}"


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
        self.sys_email = "sysadmin@thingsboard.org"


def _change_password_api_call(ctx: _PasswordChangeContext) -> bool:
    """Call API to change password."""
    url = f"{ctx.base_url}/api/auth/changePassword"
    try:
        resp = ctx.session.post(
            url,
            json={"currentPassword": ctx.default_pw, "newPassword": ctx.new_pw},
            timeout=10,
        )
        if resp.status_code == 200:
            logger.info("Sysadmin password changed successfully.")
            return True
        logger.error(f"Failed to change sysadmin password: {resp.status_code}")
        return False
    except httpx.HTTPError as e:
        logger.error(f"Network error during password change: {e}")
        return False


def _perform_password_change(ctx: _PasswordChangeContext) -> Tuple[bool, str]:
    """Perform the password change operation."""
    logger.info("Logged in with default sysadmin password. Changing to new password...")

    if not _change_password_api_call(ctx):
        return False, "Failed to change sysadmin password"

    # Log in again with new password
    token = login(ctx.base_url, ctx.sys_email, ctx.new_pw)
    if not token:
        return False, "Changed password but failed to log in with new sysadmin password"

    _update_session_token(ctx.session, token)
    logger.info("Re-logged in as sysadmin with new password.")
    return True, ""


def change_sysadmin_password_if_needed(
    base_url: str,
    session: httpx.Client,
    new_pw: str,
) -> Tuple[bool, str]:
    """Change the sysadmin password if configured."""
    sys_email = "sysadmin@thingsboard.org"
    default_pw = "sysadmin"

    # Try login with new password first
    token = _try_login_with_new_password(base_url, sys_email, new_pw)
    if token:
        logger.info("Sysadmin already uses the new password. No change needed.")
        _update_session_token(session, token)
        return True, "Password already updated"

    # Try with default password and perform change if successful
    logger.info("New password did not work, trying default sysadmin password...")
    token = login(base_url, sys_email, default_pw)
    if not token:
        return False, (
            "Failed to get authentication token for sysadmin. "
            "Verify the configuration in config/services.env."
        )

    _update_session_token(session, token)
    pw_config = _PasswordConfig(default_pw, new_pw)
    ctx = _PasswordChangeContext(base_url, session, pw_config)
    return _perform_password_change(ctx)


def _find_tenant_in_response(body: dict, tenant_name: str) -> dict | None:
    """Find tenant by name in response body."""
    for tenant in body.get("data", []):
        if tenant.get("title") == tenant_name:
            logger.info(f"  Tenant '{tenant_name}' already exists")
            return tenant
    return None


def _is_json_error(exception: Exception) -> bool:
    """Check if exception is JSON-related."""
    return "json" in str(exception).lower()


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
        error_type = "Invalid JSON" if _is_json_error(e) else "Network error"
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
        error_type = "Invalid JSON" if "json" in str(e).lower() else "Network error"
        return None, f"{error_type} creating tenant: {e}"


def _get_or_create_if_needed(
    base_url: str,
    session: httpx.Client,
    tenant_name: str,
    error_msg: str,
    tenant: dict | None,
) -> Tuple[dict | None, str]:
    """Create tenant if it doesn't exist or return error."""
    if error_msg:
        return None, error_msg
    if tenant:
        return tenant, ""
    return _create_new_tenant(base_url, session, tenant_name)


def get_or_create_tenant(
    base_url: str, session: httpx.Client, tenant_name: str
) -> Tuple[dict | None, str]:
    """Get existing tenant or create a new one."""
    try:
        params = {"pageSize": 100, "page": 0, "textSearch": tenant_name}
        tenant, error_msg = _check_existing_tenant(params, base_url, session)
        return _get_or_create_if_needed(
            base_url, session, tenant_name, error_msg, tenant
        )
    except Exception as e:
        return None, f"Exception getting/creating tenant: {e}"
