"""Creates (or fetches) a tenant, creates/activates a tenant-admin account, and
verifies the admin can log in."""

# pylint: disable=W1203, R0903
import logging
import os
from typing import Tuple
import httpx
from .tb_utility import login, verify_admin_login, is_json_parse_error
from .activation import get_activation_token, activate_user
from .sysadmin import get_or_create_tenant

logger = logging.getLogger(__name__)

# Default password set during tenant admin creation
DEFAULT_TENANT_ADMIN_PASSWORD = "tenant"  # noqa: S105 # NOSONAR


def _check_admin_exists(base_url: str, admin_email: str, admin_password: str) -> bool:
    """Check if admin already exists."""
    logger.info(f"  Checking if admin '{admin_email}' exists...")
    token = login(base_url, admin_email, admin_password)
    exists = token is not None
    if exists:
        logger.info(f"  Admin '{admin_email}' already exists and credentials match")
    return exists


class _AdminContext:
    """Context for admin user creation operations."""

    def __init__(
        self,
        base_url: str,
        session: httpx.Client,
        admin_email: str,
    ):
        self.base_url = base_url
        self.session = session
        self.admin_email = admin_email
        self.admin_password = ""


class AdminCredentials:
    """Admin user credentials."""

    def __init__(self, admin_email: str, admin_password: str):
        self.admin_email = admin_email
        self.admin_password = admin_password


class TenantAdminContext:
    """Context for creating a tenant and admin user."""

    def __init__(self, base_url: str, session: httpx.Client, tenant_name: str):
        self.base_url = base_url
        self.session = session
        self.tenant_name = tenant_name
        self.admin_credentials = None


def _create_tenant_api_call(
    ctx: _AdminContext, user_payload: dict
) -> Tuple[httpx.Response | None, str]:
    """Make API call to create tenant admin user."""
    try:
        resp = ctx.session.post(
            f"{ctx.base_url}/api/user",
            params={"sendActivationMail": "false"},
            json=user_payload,
            timeout=10,
        )
        return resp, ""
    except httpx.HTTPError as e:
        return None, f"Network error creating tenant admin: {e}"


def _handle_admin_already_exists(resp: httpx.Response) -> Tuple[str | None, str]:
    """Handle case where admin user already exists."""
    try:
        error_data = resp.json()
        error_message = error_data.get("message", "")
        if "already" in error_message.lower():
            logger.info(" Tenant admin already exists, skipping...")
            return None, ""
    except Exception:
        # Ignore JSON parsing errors when checking for existing user
        pass
    return None, f"Failed to create tenant admin: {resp.status_code}"


def _extract_user_id_from_response(resp: httpx.Response) -> Tuple[str | None, str]:
    """Extract user ID from API response."""
    try:
        user = resp.json()
        user_id = user.get("id", {}).get("id")
        return (user_id, "") if user_id else (None, "Created user response missing id")
    except Exception as e:
        error_type = "Invalid JSON" if is_json_parse_error(e) else "Unexpected error"
        return None, f"{error_type} response creating tenant admin: {e}"


def _create_tenant_admin_user(
    ctx: _AdminContext, tenant_id: str
) -> Tuple[str | None, str]:
    """Create tenant admin user."""
    logger.info(f"  Creating tenant admin '{ctx.admin_email}'...")
    user_payload = {
        "email": ctx.admin_email,
        "authority": "TENANT_ADMIN",
        "tenantId": {"id": tenant_id, "entityType": "TENANT"},
    }

    resp, error_msg = _create_tenant_api_call(ctx, user_payload)
    if not resp:
        return None, error_msg

    # Handle non-success status codes
    if resp.status_code == 400:
        return _handle_admin_already_exists(resp)
    elif resp.status_code not in (200, 201):
        return None, f"Failed to create tenant admin: {resp.status_code}"

    # Extract user ID from successful response
    return _extract_user_id_from_response(resp)


def _activate_admin(ctx: _AdminContext, user_id: str) -> Tuple[bool, str]:
    """Helper to activate admin user."""
    activate_token, error_msg = get_activation_token(ctx.base_url, ctx.session, user_id)
    if not activate_token:
        return False, error_msg

    success, error_msg = activate_user(ctx.base_url, activate_token, ctx.admin_password)
    if not success:
        return False, error_msg

    logger.info(f"  Admin '{ctx.admin_email}' created and activated")
    return verify_admin_login(ctx.base_url, ctx.admin_email, ctx.admin_password)


def _create_and_activate_admin(ctx: _AdminContext, tenant_id: str) -> Tuple[bool, str]:
    """Create tenant admin user and activate."""
    # Create tenant admin user
    user_id, error_msg = _create_tenant_admin_user(ctx, tenant_id)
    if not user_id:
        if error_msg == "":
            print(f"Tenant admin '{ctx.admin_email}' already exists, skipping...")
            return True, ""
        return False, error_msg

    return _activate_admin(ctx, user_id)


def _ensure_tenant_admin(ctx: _AdminContext, tenant: dict) -> Tuple[bool, str]:
    """Create and activate tenant admin user."""
    try:
        tenant_id_obj = tenant.get("id") or {}
        tenant_id = tenant_id_obj.get("id")
        if not tenant_id:
            return False, "Invalid tenant object, missing id"

        # Check if admin already exists or create new one
        return (
            (True, "")
            if _check_admin_exists(ctx.base_url, ctx.admin_email, ctx.admin_password)
            else _create_and_activate_admin(ctx, tenant_id)
        )
    except Exception as e:
        return False, f"Exception creating tenant admin: {e}"


def create_tenant_and_admin(ctx: TenantAdminContext) -> Tuple[bool, str]:
    """Create a tenant and its admin user."""

    tenant, error_msg = get_or_create_tenant(ctx.base_url, ctx.session, ctx.tenant_name)
    if not tenant:
        return False, error_msg

    admin_ctx = _AdminContext(
        ctx.base_url, ctx.session, ctx.admin_credentials.admin_email
    )
    admin_ctx.admin_password = ctx.admin_credentials.admin_password
    return _ensure_tenant_admin(admin_ctx, tenant)


def _login_as_tenant_admin(
    base_url: str, admin_email: str, new_pw: str
) -> Tuple[str | None, str]:
    """Try to log in as tenant admin with default or configured password.

    Returns:
        Tuple of (token_or_None, message).
        If token is returned, the default password is still in use.
        If token is None and message is empty, already using new password.
    """
    token = login(base_url, admin_email, DEFAULT_TENANT_ADMIN_PASSWORD)
    if token:
        return token, ""
    # Already using new password or can't authenticate
    if login(base_url, admin_email, new_pw):
        logger.info("Tenant admin already uses the configured password.")
        return None, ""
    return None, (
        "Failed to authenticate as tenant admin. "
        "Verify TB_TENANT_ADMIN_EMAIL in config/services.env."
    )


def _call_change_password_api(
    base_url: str, session: httpx.Client, new_pw: str
) -> Tuple[bool, str]:
    """Call ThingsBoard API to change password from default to new."""
    url = f"{base_url}/api/auth/changePassword"
    try:
        resp = session.post(
            url,
            json={
                "currentPassword": DEFAULT_TENANT_ADMIN_PASSWORD,
                "newPassword": new_pw,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return False, f"Failed to change tenant admin password: {resp.status_code}"
        logger.info("Tenant admin password changed successfully.")
        return True, ""
    except httpx.HTTPError as e:
        return False, f"Network error changing tenant admin password: {e}"


def change_tenant_admin_password(
    base_url: str, session: httpx.Client
) -> Tuple[bool, str]:
    """Change tenant admin password from default to configured value.

    Reads TB_TENANT_ADMIN_EMAIL and TB_TENANT_ADMIN_PASSWORD from env.
    If TB_TENANT_ADMIN_PASSWORD is not set, skips the change.
    """
    admin_email = os.getenv("TB_TENANT_ADMIN_EMAIL")
    new_pw = os.getenv("TB_TENANT_ADMIN_PASSWORD")
    if not new_pw:
        logger.info("TB_TENANT_ADMIN_PASSWORD not set, skipping tenant admin reset.")
        return True, "Skipped (TB_TENANT_ADMIN_PASSWORD not set)"

    token, error_msg = _login_as_tenant_admin(base_url, admin_email, new_pw)
    if not token:
        if error_msg:
            return False, error_msg
        return True, "Tenant admin password already updated"

    session.headers["X-Authorization"] = f"Bearer {token}"
    return _call_change_password_api(base_url, session, new_pw)
