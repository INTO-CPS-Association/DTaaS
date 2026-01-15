#!/usr/bin/env python3
import csv
import logging
import os
import shutil
import platform
from typing import Tuple
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import requests
import requests.exceptions
from .config import Config
from .cert import copy_certs, set_service_cert_permissions, _CertPermissionContext
from .utils import is_ci

PRIV_KEY_FILENAME = "privkey.pem"
FULLCHAIN_FILENAME = "fullchain.pem"

# Set up logger
logger = logging.getLogger(__name__)


def build_base_url() -> str:
    """Build ThingsBoard base URL from environment variables."""
    hostname = os.getenv("HOSTNAME", "localhost")
    port = os.getenv("THINGSBOARD_PORT", "8080")
    scheme = os.getenv("THINGSBOARD_SCHEME", "https")
    return f"{scheme}://{hostname}:{port}".rstrip("/")


def _handle_login_response(resp: requests.Response) -> str | None:
    """Handle login response and extract token."""
    if resp.status_code == 200:
        try:
            data = resp.json()
            return data.get("token")
        except requests.exceptions.JSONDecodeError as e:
            logger.error(f"Invalid JSON response during login: {e}")
            return None
    if resp.status_code != 401:
        logger.warning(f"Unexpected login response {resp.status_code}")
    return None


def login(base_url: str, email: str, password: str) -> str | None:
    """Authenticate with ThingsBoard and return a JWT token."""
    url = f"{base_url}/api/auth/login"
    try:
        resp = requests.post(
            url,
            json={"username": email, "password": password},
            timeout=10,
            verify=True,
        )
        return _handle_login_response(resp)
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during login: {e}")
        return None


def _check_password_configured() -> str | None:
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


def _update_session_token(session: requests.Session, token: str) -> None:
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
        self, base_url: str, session: requests.Session, pw_config: _PasswordConfig
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
            verify=True,
        )
        if resp.status_code == 200:
            logger.info("Sysadmin password changed successfully.")
            return True
        logger.error(f"Failed to change sysadmin password: {resp.status_code}")
        return False
    except requests.exceptions.RequestException as e:
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
    session: requests.Session,
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
            "Check configuration in config/services.env ensure ThingsBoard is running."
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


def _check_existing_tenant(
    params: dict, base_url: str, session: requests.Session
) -> Tuple[dict | None, str]:
    """Check if tenant already exists."""
    try:
        resp = session.get(
            f"{base_url}/api/tenants", params=params, timeout=10, verify=True
        )
        if resp.status_code != 200:
            return None, f"Failed to get tenants: {resp.status_code}"

        body = resp.json()
        tenant_name = params.get("textSearch", "")
        return _find_tenant_in_response(body, tenant_name), ""
    except requests.exceptions.JSONDecodeError as e:
        return None, f"Invalid JSON response checking tenant: {e}"
    except requests.exceptions.RequestException as e:
        return None, f"Network error checking tenant: {e}"


def _create_new_tenant(
    base_url: str, session: requests.Session, tenant_name: str
) -> Tuple[dict | None, str]:
    """Create a new tenant."""
    logger.info(f"  Creating tenant '{tenant_name}'...")
    create_payload = {"title": tenant_name}
    try:
        resp = session.post(
            f"{base_url}/api/tenant", json=create_payload, timeout=10, verify=True
        )

        if resp.status_code not in (200, 201):
            return None, f"Failed to create tenant: {resp.status_code}"

        tenant = resp.json()
        logger.info(f"  Tenant '{tenant_name}' created")
        return tenant, ""
    except (
        requests.exceptions.RequestException,
    ) as e:
        error_type = (
            "Invalid JSON response"
            if isinstance(e, requests.exceptions.JSONDecodeError)
            else "Network error"
        )
        return None, f"{error_type} creating tenant: {e}"


def _get_or_create_tenant(
    base_url: str, session: requests.Session, tenant_name: str
) -> Tuple[dict | None, str]:
    """Get existing tenant or create a new one."""
    try:
        params = {"pageSize": 100, "page": 0, "textSearch": tenant_name}
        tenant, error_msg = _check_existing_tenant(params, base_url, session)

        if error_msg or not tenant:
            return (
                (None, error_msg)
                if error_msg
                else _create_new_tenant(base_url, session, tenant_name)
            )
        return tenant, ""
    except Exception as e:
        return None, f"Exception getting/creating tenant: {e}"


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
    except (
        requests.exceptions.RequestException,
    ) as e:
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


class _ServiceCertConfig:
    """Configuration for service certificate setup."""

    def __init__(self, service_name: str, key_filename: str, cert_filename: str):
        self.service_name = service_name
        self.key_filename = key_filename
        self.cert_filename = cert_filename


class _CertSetupParams:
    """Certificate setup parameters."""

    def __init__(self, certs_dir: Path, uid: int, gid: int):
        self.certs_dir = certs_dir
        self.uid = uid
        self.gid = gid


class _TenantSetupContext:
    """Context for tenant setup operations."""

    def __init__(self, cert_cfg: _ServiceCertConfig, params: _CertSetupParams):
        self.cert_cfg = cert_cfg
        self.certs_dir = params.certs_dir
        self.uid = params.uid
        self.gid = params.gid


def _copy_service_cert_files(setup_ctx: _TenantSetupContext) -> Tuple[tuple, bool, str]:
    """Copy service certificate files and return paths."""
    privkey_path = setup_ctx.certs_dir / PRIV_KEY_FILENAME
    fullchain_path = setup_ctx.certs_dir / FULLCHAIN_FILENAME
    service_key_path = setup_ctx.certs_dir / setup_ctx.cert_cfg.key_filename
    service_cert_path = setup_ctx.certs_dir / setup_ctx.cert_cfg.cert_filename

    shutil.copy2(privkey_path, service_key_path)
    shutil.copy2(fullchain_path, service_cert_path)
    return (service_key_path, service_cert_path), True, ""


def _set_service_cert_file_permissions(
    setup_ctx: _TenantSetupContext, service_key_path: Path, service_cert_path: Path
) -> Tuple[bool, str]:
    """Set permissions on service certificate files."""
    # Set permissions on private key
    ctx = _CertPermissionContext(
        setup_ctx.cert_cfg.service_name,
        service_key_path,
        setup_ctx.uid,
        setup_ctx.gid,
        0o600,
    )
    success, msg = set_service_cert_permissions(ctx)
    if not success:
        return False, msg

    # Set permissions on certificate (readable)
    ctx = _CertPermissionContext(
        setup_ctx.cert_cfg.service_name,
        service_cert_path,
        setup_ctx.uid,
        setup_ctx.gid,
        0o644,
    )
    return set_service_cert_permissions(ctx)


def _setup_service_certs(setup_ctx: _TenantSetupContext) -> Tuple[bool, str]:
    """Set up service certificates with proper permissions."""
    try:
        (service_key_path, service_cert_path), _, _ = _copy_service_cert_files(
            setup_ctx
        )
        return _set_service_cert_file_permissions(
            setup_ctx, service_key_path, service_cert_path
        )
    except OSError as e:
        return (
            False,
            f"Error setting up {setup_ctx.cert_cfg.service_name} certificates: {e}",
        )


def _setup_postgres_certs(certs_dir: Path, uid: int, gid: int) -> Tuple[bool, str]:
    """Set up PostgreSQL certificates with proper permissions."""
    cfg = _ServiceCertConfig("PostgreSQL", "postgres.key", "postgres.crt")
    params = _CertSetupParams(certs_dir, uid, gid)
    setup_ctx = _TenantSetupContext(cfg, params)
    return _setup_service_certs(setup_ctx)


def _setup_thingsboard_certs(certs_dir: Path, uid: int, gid: int) -> Tuple[bool, str]:
    """Set up ThingsBoard certificates with proper permissions."""
    cfg = _ServiceCertConfig(
        "ThingsBoard", "thingsboard-privkey.pem", "thingsboard-fullchain.pem"
    )
    params = _CertSetupParams(certs_dir, uid, gid)
    setup_ctx = _TenantSetupContext(cfg, params)
    return _setup_service_certs(setup_ctx)


class _SetupConfig:
    """Configuration container for ThingsBoard setup."""

    def __init__(self):
        self.config = Config()
        self.base_dir = Config.get_base_dir()
        self.os_type = platform.system().lower()
        self.host_name = self.config.get_value("HOSTNAME")
        self.certs_dir = self.base_dir / "certs" / self.host_name
        self.postgres_uid = int(self.config.get_value("POSTGRES_UID"))
        self.postgres_gid = int(self.config.get_value("POSTGRES_GID"))
        self.thingsboard_uid = int(self.config.get_value("THINGSBOARD_UID"))
        self.thingsboard_gid = int(self.config.get_value("THINGSBOARD_GID"))


def _chown_path(path: Path, uid: int, gid: int) -> None:
    """Change ownership of a single path."""
    shutil.chown(path, user=uid, group=gid)


def _change_ownership_recursive(root: str, uid: int, gid: int) -> None:
    """Recursively change ownership of all items in directory."""
    for root_dir, dirs, files in os.walk(root):
        for d in dirs:
            _chown_path(Path(root_dir) / d, uid, gid)
        for f in files:
            _chown_path(Path(root_dir) / f, uid, gid)


def _set_directory_ownership(directory: Path, uid: int, gid: int) -> None:
    """Set ownership for directory and all its contents."""
    _chown_path(directory, uid, gid)
    _change_ownership_recursive(str(directory), uid, gid)


def _apply_directory_ownership_if_needed(
    cfg: _SetupConfig, data_dir: Path, log_dir: Path
) -> str:
    """Apply directory ownership if running on POSIX system outside CI."""
    if cfg.os_type in ("linux", "darwin") and not is_ci():
        _set_directory_ownership(data_dir, cfg.thingsboard_uid, cfg.thingsboard_gid)
        _set_directory_ownership(log_dir, cfg.thingsboard_uid, cfg.thingsboard_gid)
        return f"ThingsBoard data and log directories ownership set to {cfg.thingsboard_uid}:{cfg.thingsboard_gid}"
    return "ThingsBoard data and log directories created (ownership skipped)"


def _setup_thingsboard_directories(cfg: _SetupConfig) -> Tuple[bool, str]:
    """Set up ThingsBoard data and log directories with proper ownership."""
    try:
        data_dir = cfg.base_dir / "data" / "thingsboard"
        log_dir = cfg.base_dir / "log" / "thingsboard"
        data_dir.mkdir(parents=True, exist_ok=True)
        log_dir.mkdir(parents=True, exist_ok=True)

        msg = _apply_directory_ownership_if_needed(cfg, data_dir, log_dir)
        return True, msg
    except OSError as e:
        return False, f"Error setting up ThingsBoard directories: {e}"


def _verify_certificates_exist(certs_dir: Path) -> Tuple[bool, str]:
    """Verify normalized certificates exist."""
    privkey_path = certs_dir / PRIV_KEY_FILENAME
    fullchain_path = certs_dir / FULLCHAIN_FILENAME

    if not privkey_path.exists() or not fullchain_path.exists():
        return False, f"Normalized certificates not found in {certs_dir}"
    return True, ""


def _execute_setup_operations(cfg: _SetupConfig) -> Tuple[bool, list]:
    """Execute all setup operations.

    Args:
        cfg: Setup configuration object

    Returns:
        Tuple indicating success and list of messages
    """
    messages = []
    operations = [
        (_setup_postgres_certs, cfg.certs_dir, cfg.postgres_uid, cfg.postgres_gid),
        (
            _setup_thingsboard_certs,
            cfg.certs_dir,
            cfg.thingsboard_uid,
            cfg.thingsboard_gid,
        ),
        (_setup_thingsboard_directories, cfg),
    ]

    for operation_func, *args in operations:
        success, msg = operation_func(*args)
        if not success:
            return False, [msg]
        messages.append(msg)

    return True, messages


def _prepare_certificates_and_setup(cfg: _SetupConfig) -> Tuple[bool, list]:
    """Helper to prepare certificates and execute setup operations."""
    success, error_msg = _verify_certificates_exist(cfg.certs_dir)
    if not success:
        return False, [error_msg]
    return _execute_setup_operations(cfg)


def permissions_thingsboard() -> Tuple[bool, str]:
    """Set up certificates and permissions for ThingsBoard and PostgreSQL."""
    try:
        success, msg = copy_certs()
        if not success:
            return False, f"Failed to copy certificates: {msg}"

        messages = [msg]
        cfg = _SetupConfig()
        success, setup_messages = _prepare_certificates_and_setup(cfg)
        if success:
            messages.extend(setup_messages)
            return True, "; ".join(messages)
        raise RuntimeError(setup_messages[0])
    except Exception as e:
        logger.error(f"Error setting up ThingsBoard: {e}")
        return False, str(e)


def thingsboard_configure() -> Tuple[bool, str]:
    """Configure ThingsBoard users from credentials.csv."""
    logger.info("Configuring ThingsBoard users...")
    success, msg = setup_thingsboard_users()

    if not success:
        return False, f"Error: {msg}"

    logger.info(f"\n{msg}")
    logger.info("ThingsBoard configuration complete!")
    return True, msg
