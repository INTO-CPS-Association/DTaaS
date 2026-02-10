"""ThingsBoard installation, service and user management."""

# pylint: disable=W1203, R0903
import csv
import logging
from typing import Tuple
from pathlib import Path
import httpx
from .config import Config
from .thingsboard_users import (
    check_password_configured,
    build_base_url,
    change_sysadmin_password_if_needed,
    _get_ssl_verify,
)

from .thingsboard_utility import (
    CredentialProcessContext,
    create_tenant_and_admin,
    validate_credential_row,
    TenantAdminContext,
    AdminCredentials,
)

# Set up logger
logger = logging.getLogger(__name__)


def _process_credentials_row(
    ctx: CredentialProcessContext, credential: dict
) -> Tuple[bool, str]:
    """Process a single credential row."""
    username = credential["username"]
    password = credential["password"]

    # Validate email field and check for duplicates
    success, result = validate_credential_row(credential, username, ctx.seen_emails)
    if not success:
        return False, result

    email = result
    ctx.seen_emails.add(email)

    logger.info(f"\nProcessing user '{username}'...")
    tenant_admin_ctx = TenantAdminContext(ctx.base_url, ctx.session, username)
    tenant_admin_ctx.admin_credentials = AdminCredentials(email, password)
    success, error_msg = create_tenant_and_admin(tenant_admin_ctx)

    return (
        (False, f"Failed for user {username}: {error_msg}")
        if not success
        else (True, "")
    )


def _process_credentials_file(
    base_url: str, session: httpx.Client, credentials_file: Path
) -> Tuple[bool, str]:
    """Process credentials file and create tenants."""
    ctx = CredentialProcessContext(base_url, session)
    with credentials_file.open(mode="r", newline="", encoding="utf-8") as creds_file:
        credentials = csv.DictReader(creds_file, delimiter=",")

        # Validate required columns
        if "email" not in credentials.fieldnames:
            return False, "Email column is required in credentials.csv"

        for credential in credentials:
            success, error_msg = _process_credentials_row(ctx, credential)
            if not success:
                return False, error_msg
    return True, "ThingsBoard users created successfully"


def _is_password_change_recoverable(error_msg: str) -> bool:
    """Check if password change error is recoverable."""
    return any(
        x in error_msg.lower() for x in ["not reachable", "unable to log in", "ssl"]
    )


def _change_password_with_logging(
    base_url: str, session: httpx.Client, new_pw: str
) -> Tuple[bool, str]:
    """Attempt to change sysadmin password with logging suppression."""
    tb_logger = logging.getLogger("dtaas_services.pkg.thingsboard_users")
    old_level = tb_logger.level
    tb_logger.setLevel(logging.CRITICAL)

    try:
        return change_sysadmin_password_if_needed(base_url, session, new_pw)
    finally:
        tb_logger.setLevel(old_level)


def _handle_password_change_result(
    success: bool, error_msg: str
) -> Tuple[bool, str | None]:
    """Handle password change result and return error if not recoverable."""
    if not success:
        if _is_password_change_recoverable(error_msg):
            logger.warning(
                f"Could not change sysadmin password: {error_msg}. "
                "Continuing with user setup..."
            )
            return True, None
        return False, error_msg
    return True, None


def _create_session() -> httpx.Client:
    """Create HTTP session with SSL verification settings."""
    # Increased timeout to 30s to handle self-signed certificates
    # (SSL handshake can be slow with dummy/self-signed certs)
    return httpx.Client(verify=_get_ssl_verify(), timeout=30)


def _setup_helper_certs(credentials_file: Path) -> Tuple[bool, str]:
    """Helper to set up credentials and change password."""
    try:
        Config()  # Loads config/services.env into environment
        base_url = build_base_url()
        session = _create_session()
        new_pw = check_password_configured()

        # Change password if configured
        if new_pw:
            success, error_msg = _change_password_with_logging(
                base_url, session, new_pw
            )
            should_continue, error = _handle_password_change_result(success, error_msg)
            if not should_continue:
                return False, error

        return _process_credentials_file(base_url, session, credentials_file)
    except (OSError, httpx.HTTPError) as e:
        logger.error(f"Connection error connecting to ThingsBoard: {e}")
        return (
            False,
            f"Cannot connect to ThingsBoard at {build_base_url()}. Check HOSTNAME in services.env.",
        )
    except (ValueError, KeyError) as e:
        logger.error(f"Error in ThingsBoard setup: {e}")
        return False, f"Error in ThingsBoard setup: {e}"


def setup_thingsboard_users() -> Tuple[bool, str]:
    """Add users to ThingsBoard service."""
    base_dir = Config.get_base_dir()
    credentials_file = base_dir / "config" / "credentials.csv"

    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        return _setup_helper_certs(credentials_file)
    except (OSError, ValueError, KeyError) as e:
        logger.error(f"Error adding ThingsBoard users: {e}")
        return False, f"Error adding ThingsBoard users: {e}"


def thingsboard_configure() -> Tuple[bool, str]:
    """Configure ThingsBoard users from credentials.csv."""
    logger.info("Configuring ThingsBoard users...")
    success, msg = setup_thingsboard_users()

    if not success:
        return False, f"Error: {msg}"

    logger.info(f"\n{msg}")
    logger.info("ThingsBoard configuration complete!")
    return True, msg
