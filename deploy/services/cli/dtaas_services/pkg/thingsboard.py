"""ThingsBoard installation, service and user management."""

import csv
import logging
from typing import Tuple
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import requests
import requests.exceptions
from .config import Config
from .thingsboard_users import (
    _check_password_configured,
    login,
    _get_or_create_tenant,
    build_base_url,
    change_sysadmin_password_if_needed,
)

PRIV_KEY_FILENAME = "privkey.pem"
FULLCHAIN_FILENAME = "fullchain.pem"

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
        session: requests.Session,
        admin_email: str,
    ):
        self.base_url = base_url
        self.session = session
        self.admin_email = admin_email
        self.admin_password = ""


class _AdminCredentials:
    """Admin user credentials."""

    def __init__(self, admin_email: str, admin_password: str):
        self.admin_email = admin_email
        self.admin_password = admin_password


class _TenantAdminContext:
    """Context for creating a tenant and admin user."""

    def __init__(self, base_url: str, session: requests.Session, tenant_name: str):
        self.base_url = base_url
        self.session = session
        self.tenant_name = tenant_name
        self.admin_credentials = None


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
    try:
        resp = ctx.session.post(
            f"{ctx.base_url}/api/user",
            params={"sendActivationMail": "false"},
            json=user_payload,
            timeout=10,
            verify=True,
        )

        if resp.status_code not in (200, 201):
            return None, f"Failed to create tenant admin: {resp.status_code}"

        user = resp.json()
        user_id = user.get("id", {}).get("id")
        return (user_id, "") if user_id else (None, "Created user response missing id")
    except (requests.exceptions.RequestException,) as e:
        error_type = (
            "Invalid JSON response"
            if isinstance(e, requests.exceptions.JSONDecodeError)
            else "Network error"
        )
        return None, f"{error_type} creating tenant admin: {e}"


def _get_activation_token(
    base_url: str, session: requests.Session, user_id: str
) -> Tuple[str | None, str]:
    """Get activation token for user."""
    try:
        resp = session.get(
            f"{base_url}/api/user/{user_id}/activationLink", timeout=10, verify=True
        )
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
    except requests.exceptions.RequestException as e:
        return None, f"Network error getting activation token: {e}"


def _activate_user(
    base_url: str, activate_token: str, admin_password: str
) -> Tuple[bool, str]:
    """Activate user with password."""
    activate_payload = {
        "activateToken": activate_token,
        "password": admin_password,
    }
    try:
        resp = requests.post(
            f"{base_url}/api/noauth/activate",
            json=activate_payload,
            timeout=10,
            verify=True,
        )

        if resp.status_code != 200:
            error_msg = f"Failed to activate tenant admin: {resp.status_code}"
            return False, error_msg

        return True, ""
    except requests.exceptions.RequestException as e:
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


def _create_tenant_and_admin(ctx: _TenantAdminContext) -> Tuple[bool, str]:
    """Create a tenant and its admin user."""
    tenant, error_msg = _get_or_create_tenant(
        ctx.base_url, ctx.session, ctx.tenant_name
    )
    if not tenant:
        return False, error_msg

    admin_ctx = _AdminContext(
        ctx.base_url, ctx.session, ctx.admin_credentials.admin_email
    )
    admin_ctx.admin_password = ctx.admin_credentials.admin_password
    return _ensure_tenant_admin(admin_ctx, tenant)


class _CredentialProcessContext:
    """Context for processing credentials."""

    def __init__(self, base_url: str, session: requests.Session):
        self.base_url = base_url
        self.session = session
        self.seen_emails = set()


def _validate_credential_row(
    credential: dict, username: str, seen_emails: set
) -> Tuple[bool, str]:
    """Validate a credential row and check for duplicates."""
    email = credential.get("email", "").strip()

    if not email:
        return False, f"Email field is required for user {username}"
    if email in seen_emails:
        return False, f"Duplicate email '{email}' found for user {username}"
    return True, email


def _process_credentials_row(
    ctx: _CredentialProcessContext, credential: dict
) -> Tuple[bool, str]:
    """Process a single credential row."""
    username = credential["username"]
    password = credential["password"]

    # Validate email field and check for duplicates
    success, result = _validate_credential_row(credential, username, ctx.seen_emails)
    if not success:
        return False, result

    email = result
    ctx.seen_emails.add(email)

    logger.info(f"\nProcessing user '{username}'...")
    tenant_admin_ctx = _TenantAdminContext(ctx.base_url, ctx.session, username)
    tenant_admin_ctx.admin_credentials = _AdminCredentials(email, password)
    success, error_msg = _create_tenant_and_admin(tenant_admin_ctx)

    return (
        (False, f"Failed for user {username}: {error_msg}")
        if not success
        else (True, "")
    )


def _process_credentials_file(
    base_url: str, session: requests.Session, credentials_file: Path
) -> Tuple[bool, str]:
    """Process credentials file and create tenants."""
    ctx = _CredentialProcessContext(base_url, session)
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

    session = requests.Session()
    new_pw = _check_password_configured()
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
