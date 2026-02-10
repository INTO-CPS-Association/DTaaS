"""Utility functions for ThingsBoard user and tenant management."""

# pylint: disable=W1203, R0903
import logging
from typing import Tuple
from urllib.parse import urlparse, parse_qs
import httpx
from .thingsboard_users import login, _get_ssl_verify

# Set up logger
logger = logging.getLogger(__name__)


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


def _is_json_parse_error(exception: Exception) -> bool:
    """Check if exception is JSON parsing related."""
    return "json" in str(exception).lower()


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
        error_type = "Invalid JSON" if _is_json_parse_error(e) else "Unexpected error"
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
    if resp.status_code not in (200, 201):
        # 400 often means user already exists
        if resp.status_code == 400:
            return _handle_admin_already_exists(resp)
        return None, f"Failed to create tenant admin: {resp.status_code}"

    # Extract user ID from successful response
    return _extract_user_id_from_response(resp)


def _get_activation_token(
    base_url: str, session: httpx.Client, user_id: str
) -> Tuple[str | None, str]:
    """Get activation token for user."""
    try:
        resp = session.get(f"{base_url}/api/user/{user_id}/activationLink", timeout=10)
        if resp.status_code != 200:
            return None, f"Failed to get activation link: {resp.status_code}"

        activation_link = resp.text.strip().strip('"')
        parsed = urlparse(activation_link)
        qs = parse_qs(parsed.query)
        tokens = qs.get("activateToken") or qs.get("activateToken".lower())

        return (
            (tokens[0], "")
            if tokens
            else (None, "Could not extract activateToken from activation link")
        )
    except httpx.HTTPError as e:
        return None, f"Network error getting activation token: {e}"


def _is_ssl_error_activate(error_str: str) -> bool:
    """Check if error is SSL-related."""
    return (
        "certificate verify failed" in error_str.lower() or "ssl" in error_str.lower()
    )


def _activate_user(
    base_url: str, activate_token: str, admin_password: str
) -> Tuple[bool, str]:
    """Activate user with password."""
    activate_payload = {
        "activateToken": activate_token,
        "password": admin_password,
    }
    try:
        resp = httpx.post(
            f"{base_url}/api/noauth/activate",
            json=activate_payload,
            timeout=15,
            verify=_get_ssl_verify(),
        )

        if resp.status_code != 200:
            return False, f"Failed to activate tenant admin: {resp.status_code}"
        return True, ""
    except httpx.HTTPError as e:
        error_str = str(e)
        if _is_ssl_error_activate(error_str):
            return False, f"SSL certificate verification failed: {e}\n"
        return False, f"Network error activating user: {e}"


def _verify_admin_login(
    base_url: str, admin_email: str, admin_password: str
) -> Tuple[bool, str]:
    """Verify admin can login."""
    token = login(base_url, admin_email, admin_password)
    if not token:
        return False, "Created admin but login verification failed"
    return True, ""


def _activate_admin(ctx: _AdminContext, user_id: str) -> Tuple[bool, str]:
    """Helper to activate admin user."""
    # Get activation token
    activate_token, error_msg = _get_activation_token(
        ctx.base_url, ctx.session, user_id
    )
    if not activate_token:
        return False, error_msg

    # Activate user and verify login
    success, error_msg = _activate_user(
        ctx.base_url, activate_token, ctx.admin_password
    )
    if not success:
        return False, error_msg

    logger.info(f"  Admin '{ctx.admin_email}' created and activated")
    return _verify_admin_login(ctx.base_url, ctx.admin_email, ctx.admin_password)


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
    from .thingsboard_users import get_or_create_tenant

    tenant, error_msg = get_or_create_tenant(ctx.base_url, ctx.session, ctx.tenant_name)
    if not tenant:
        return False, error_msg

    admin_ctx = _AdminContext(
        ctx.base_url, ctx.session, ctx.admin_credentials.admin_email
    )
    admin_ctx.admin_password = ctx.admin_credentials.admin_password
    return _ensure_tenant_admin(admin_ctx, tenant)


class CredentialProcessContext:
    """Context for processing credentials."""

    def __init__(self, base_url: str, session: httpx.Client):
        self.base_url = base_url
        self.session = session
        self.seen_emails = set()


def validate_credential_row(
    credential: dict, username: str, seen_emails: set
) -> Tuple[bool, str]:
    """Validate a credential row and check for duplicates."""
    email = credential.get("email", "").strip()

    if not email:
        return False, f"Email field is required for user {username}"
    if email in seen_emails:
        return False, f"Duplicate email '{email}' found for user {username}"
    return True, email
