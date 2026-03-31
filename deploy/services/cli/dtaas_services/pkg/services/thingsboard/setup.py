"""ThingsBoard installation and setup orchestration."""

# pylint: disable=W1203, R0903
import logging
import os
from typing import Tuple
from pathlib import Path
import httpx
from ...config import Config
from .tb_utility import get_ssl_verify, login
from .sysadmin import (
    authenticate_session,
    change_sysadmin_password,
)
from .sysadmin_util import change_sysadmin_email
from .setup_credentials import process_credentials_file
from .tenant_admin import (
    change_tenant_admin_password,
    create_tenant_and_admin,
    TenantAdminContext,
    AdminCredentials,
    DEFAULT_TENANT_ADMIN_PASSWORD,
    TENANT_PW_KEY,
)
from .tb_cert import build_base_url
from ...password_store import get_current_password

logger = logging.getLogger(__name__)


def _authenticate_as_tenant_admin(
    base_url: str, session: httpx.Client
) -> Tuple[bool, str]:
    """Authenticate session as tenant admin, trying stored, default, then configured pw."""
    admin_email = os.getenv("TB_TENANT_ADMIN_EMAIL", "").strip()
    configured_pw = os.getenv("TB_TENANT_ADMIN_PASSWORD")
    stored_pw = get_current_password(TENANT_PW_KEY)
    candidates = [stored_pw, DEFAULT_TENANT_ADMIN_PASSWORD, configured_pw]
    for pw in filter(None, candidates):
        token = login(base_url, admin_email, pw)
        if token:
            session.headers["X-Authorization"] = f"Bearer {token}"
            return True, ""
    return False, (
        "Failed to authenticate as tenant admin. "
        "Verify TB_TENANT_ADMIN_EMAIL in config/services.env is correct."
    )


def _change_password_with_logging(
    base_url: str, session: httpx.Client, new_pw: str
) -> Tuple[bool, str]:
    """Attempt to change sysadmin password with logging suppression."""
    tb_logger = logging.getLogger("dtaas_services.pkg.services.thingsboard.sysadmin")
    old_level = tb_logger.level
    tb_logger.setLevel(logging.CRITICAL)

    try:
        return change_sysadmin_password(base_url, session, new_pw)
    finally:
        tb_logger.setLevel(old_level)


def check_password_configured() -> str | None:
    """Check if new password is configured."""
    new_pw = os.getenv("TB_SYSADMIN_NEW_PASSWORD")
    if not new_pw:
        logger.info(
            "TB_SYSADMIN_NEW_PASSWORD is not set in config/services.env. "
            "Skipping sysadmin password change."
        )
    return new_pw


def _create_session() -> httpx.Client:
    """Create HTTP session with SSL verification settings."""
    return httpx.Client(verify=get_ssl_verify(), timeout=30)


def _authenticate_as_sysadmin(base_url: str, session: httpx.Client) -> Tuple[bool, str]:
    """Authenticate session as sysadmin using configured email."""
    return authenticate_session(base_url, session)


def _create_tenant_setup(base_url: str, session: httpx.Client) -> Tuple[bool, str]:
    """Authenticate as sysadmin and create tenant with tenant admin."""
    auth_ok, auth_err = _authenticate_as_sysadmin(base_url, session)
    if not auth_ok:
        return False, auth_err
    tenant_title = os.getenv("TB_TENANT_TITLE", "DTaaS")
    admin_email = os.getenv("TB_TENANT_ADMIN_EMAIL", "")
    ctx = TenantAdminContext(base_url, session, tenant_title)
    ctx.admin_credentials = AdminCredentials(admin_email, DEFAULT_TENANT_ADMIN_PASSWORD)
    return create_tenant_and_admin(ctx)


def _run_credential_setup(credentials_file: Path) -> Tuple[bool, str]:
    """Create tenant+admin, authenticate as tenant admin, process CSV."""
    Config()  # Loads config/services.env into environment
    base_url = build_base_url()
    session = _create_session()

    # Step 1: Create tenant and admin (as sysadmin)
    ok, err = _create_tenant_setup(base_url, session)
    if not ok:
        return False, err

    # Step 2: Authenticate as tenant admin
    auth_ok, auth_err = _authenticate_as_tenant_admin(base_url, session)
    if not auth_ok:
        return False, auth_err
    return process_credentials_file(base_url, session, credentials_file)


def setup_thingsboard_users() -> Tuple[bool, str]:
    """Add users to ThingsBoard service."""
    base_dir = Config.get_base_dir()
    credentials_file = base_dir / "config" / "credentials.csv"

    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        return _run_credential_setup(credentials_file)
    except (OSError, httpx.HTTPError) as e:
        logger.error(f"Connection error connecting to ThingsBoard: {e}")
        return (
            False,
            f"Cannot connect to ThingsBoard at {build_base_url()}. Check HOSTNAME in services.env.",
        )
    except (ValueError, KeyError) as e:
        logger.error(f"Error adding ThingsBoard users: {e}")
        return False, f"Error adding ThingsBoard users: {e}"


def _change_sysadmin_email_if_needed(
    base_url: str, session: httpx.Client
) -> Tuple[bool, str]:
    """Authenticate as sysadmin and change email if configured differently."""
    auth_ok, auth_err = _authenticate_as_sysadmin(base_url, session)
    if not auth_ok:
        return False, auth_err
    configured_email = os.getenv("TB_SYSADMIN_EMAIL", "").strip()
    if configured_email == "":
        logger.info(
            "TB_SYSADMIN_EMAIL is not set in config/services.env. "
            "Using default sysadmin email."
        )
        return True, ""
    return change_sysadmin_email(base_url, session, configured_email)


def _reset_sysadmin_credentials(
    base_url: str, session: httpx.Client, new_pw: str
) -> Tuple[bool, str]:
    """Change sysadmin email and password."""
    messages = []

    email_ok, email_msg = _change_sysadmin_email_if_needed(base_url, session)
    if not email_ok:
        messages.append(f"Sysadmin email: {email_msg}")

    sysadmin_ok, sysadmin_msg = _change_password_with_logging(base_url, session, new_pw)
    if not sysadmin_ok:
        messages.append(f"Sysadmin password: {sysadmin_msg}")

    if messages:
        return False, "; ".join(messages)
    return True, ""


def _do_password_reset(
    base_url: str, session: httpx.Client, new_pw: str
) -> Tuple[bool, str]:
    """Change sysadmin and tenant admin credentials."""
    sysadmin_ok, sysadmin_msg = _reset_sysadmin_credentials(base_url, session, new_pw)
    if not sysadmin_ok:
        return False, sysadmin_msg

    ta_ok, ta_msg = change_tenant_admin_password(base_url, session)
    if not ta_ok:
        return True, (
            "Sysadmin password reset successfully. "
            f"Tenant admin password was not reset: {ta_msg} "
            "(Re-run this command once the tenant admin account has been created.)"
        )

    return True, "ThingsBoard credentials updated successfully"


def reset_thingsboard_password() -> Tuple[bool, str]:
    """Reset ThingsBoard sysadmin and tenant admin passwords.

    Reads TB_SYSADMIN_NEW_PASSWORD and TB_TENANT_ADMIN_PASSWORD from
    config/services.env and changes passwords from their defaults.

    Returns:
        Tuple of (success, message)
    """
    try:
        Config()  # Loads config/services.env into environment
        base_url = build_base_url()
        session = _create_session()
        new_pw = check_password_configured()
        if not new_pw:
            return False, (
                "TB_SYSADMIN_NEW_PASSWORD is not set in config/services.env. "
                "Cannot reset password."
            )
        return _do_password_reset(base_url, session, new_pw)
    except (OSError, httpx.HTTPError, ValueError, KeyError) as e:
        logger.error(f"Error resetting ThingsBoard password: {e}")
        return False, (
            f"Cannot connect to ThingsBoard at {build_base_url()}. Error: {e}"
        )
