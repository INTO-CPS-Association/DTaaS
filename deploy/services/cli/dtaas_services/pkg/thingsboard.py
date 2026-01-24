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


def _setup_helper_certs(credentials_file: Path) -> Tuple[bool, str]:
    """Helper to set up credentials and change password."""
    # Initialize Config to load environment variables
    Config()
    base_url = build_base_url()
    logger.info(f"Using ThingsBoard URL: {base_url}")

    session = httpx.Client(verify=True)
    new_pw = check_password_configured()
    if new_pw:
        success, error_msg = change_sysadmin_password_if_needed(
            base_url, session, new_pw
        )
        if not success:
            return False, error_msg

    return _process_credentials_file(base_url, session, credentials_file)


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
