"""ThingsBoard user management functions."""

# pylint: disable=W1203, R0903
import logging
import os
import time
from typing import Tuple
import json
import httpx

PRIV_KEY_FILENAME = "privkey.pem"
FULLCHAIN_FILENAME = "fullchain.pem"

# Set up logger
logger = logging.getLogger(__name__)


def _get_ssl_verify() -> bool:
    """Get SSL_VERIFY from environment (after Config loads services.env).
    Deferred to runtime so this module can be imported even when
    config/services.env doesn't exist (e.g., during generate-project).
    """
    raw = os.getenv("SSL_VERIFY", "true").strip().lower()
    return raw not in ("false", "0", "no", "off")


def build_base_url() -> str:
    """
    Build ThingsBoard base URL from environment variables.
    Uses HOSTNAME from environment (must match certificate domain name).
    """
    hostname = os.getenv("HOSTNAME", "localhost")
    port = os.getenv("THINGSBOARD_PORT", "8080")
    scheme = os.getenv("THINGSBOARD_SCHEME", "https")
    return f"{scheme}://{hostname}:{port}".rstrip("/")


def _handle_login_response(resp: httpx.Response) -> str | None:
    """Handle login response and extract token."""
    if resp.status_code == 200:
        try:
            data = resp.json()
            return data.get("token")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response during login: {e}")
            return None
    if resp.status_code != 401:
        logger.warning(f"Unexpected login response {resp.status_code}")
    return None


def _is_ssl_error(error_str: str) -> bool:
    """Check if error is SSL-related."""
    return (
        "certificate verify failed" in error_str.lower() or "ssl" in error_str.lower()
    )


def _log_login_error(error: httpx.HTTPError) -> None:
    """Log login error with appropriate context."""
    error_str = str(error)
    if _is_ssl_error(error_str):
        logger.error(
            f"SSL certificate verification failed: {error}\n"
            " Using self-signed certificates? Change SSL_VERIFY in services.env to False\n"
        )
    else:
        logger.error(f"Network error during login: {error}")


def login(base_url: str, email: str, password: str) -> str | None:
    """Authenticate with ThingsBoard and return a JWT token.

    Args:
        base_url: ThingsBoard base URL
        email: User email
        password: User password
        max_retries: Maximum number of retry attempts (default 3)

    Returns:
        JWT token if successful, None otherwise
    """
    url = f"{base_url}/api/auth/login"

    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = httpx.post(
                url,
                json={"username": email, "password": password},
                timeout=10,
                verify=_get_ssl_verify(),
            )
            token = _handle_login_response(resp)
            if token:
                return token

            # If 401, credentials are wrong, return.
            if resp.status_code == 401:
                return None

            # For other errors, retry with backoff
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.info(f"Login attempt {attempt + 1}"
                            f" failed, retrying in {wait_time}s...")
                time.sleep(wait_time)

        except httpx.HTTPError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.info(f"Connection error, retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                _log_login_error(e)

    return None


def check_password_configured() -> str | None:
    """Check if new password is configured."""
    new_pw = os.getenv("TB_SYSADMIN_NEW_PASSWORD")
    if not new_pw:
        logger.info(
            "TB_SYSADMIN_NEW_PASSWORD is not set in config/services.env. "
            "Skipping sysadmin password change."
        )
    return new_pw


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
            "Unable to log in as sysadmin with either new or default password. "
            "Check configuration in config/services.env and ensure ThingsBoard is running."
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
