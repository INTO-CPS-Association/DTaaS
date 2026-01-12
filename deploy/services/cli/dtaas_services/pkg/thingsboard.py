#!/usr/bin/env python3
"""ThingsBoard setup and configuration utilities."""

import csv
import logging
import os
import sys
import shutil
import platform
from typing import Tuple
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import requests
import requests.exceptions
from .config import Config
from .cert import copy_certs
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


def _change_password_api_call(
    base_url: str, session: requests.Session, default_pw: str, new_pw: str
) -> bool:
    """Call API to change password."""
    url = f"{base_url}/api/auth/changePassword"
    try:
        resp = session.post(
            url,
            json={"currentPassword": default_pw, "newPassword": new_pw},
            timeout=10,
        )
        if resp.status_code == 200:
            logger.info("Sysadmin password changed successfully.")
            return True
        logger.error(f"Failed to change sysadmin password: {resp.status_code}")
        return False
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during password change: {e}")
        return False


def _perform_password_change(
    base_url: str,
    session: requests.Session,
    sys_email: str,
    default_pw: str,
    new_pw: str,
) -> Tuple[bool, str]:
    """Perform the password change operation."""
    logger.info("Logged in with default sysadmin password. Changing to new password...")

    if not _change_password_api_call(base_url, session, default_pw, new_pw):
        return False, "Failed to change sysadmin password"

    # Log in again with new password
    token = login(base_url, sys_email, new_pw)
    if not token:
        return False, "Changed password but failed to log in with new sysadmin password"

    _update_session_token(session, token)
    logger.info("Re-logged in as sysadmin with new password.")
    return True, ""


def change_sysadmin_password_if_needed(
    base_url: str,
    session: requests.Session,
) -> Tuple[bool, str]:
    """Change the sysadmin password if configured."""
    sys_email = "sysadmin@thingsboard.org"
    default_pw = "sysadmin"

    new_pw = _check_password_configured()
    if not new_pw:
        return True, "No new password configured"

    # Try login with new password first
    token = _try_login_with_new_password(base_url, sys_email, new_pw)
    if token:
        logger.info("Sysadmin already uses the new password. No change needed.")
        _update_session_token(session, token)
        return True, "Password already updated"

    # Try with default password
    logger.info("New password did not work, trying default sysadmin password...")
    token = login(base_url, sys_email, default_pw)
    if not token:
        return False, (
            "Unable to log in as sysadmin with either new or default password. "
            "Check configuration in config/services.env and ensure ThingsBoard is running."
        )

    _update_session_token(session, token)
    return _perform_password_change(base_url, session, sys_email, default_pw, new_pw)


def _check_existing_tenant(
    params: dict, base_url: str, session: requests.Session
) -> Tuple[dict | None, str]:
    """Check if tenant already exists."""
    try:
        resp = session.get(f"{base_url}/api/tenants", params=params, timeout=10)
        if resp.status_code != 200:
            return None, f"Failed to get tenants: {resp.status_code}"

        body = resp.json()
        tenant_name = params.get("textSearch", "")
        for tenant in body.get("data", []):
            if tenant.get("title") == tenant_name:
                logger.info(f"  Tenant '{tenant_name}' already exists")
                return tenant, ""
        return None, ""
    except requests.exceptions.RequestException as e:
        return None, f"Network error checking tenant: {e}"
    except requests.exceptions.JSONDecodeError as e:
        return None, f"Invalid JSON response checking tenant: {e}"


def _create_new_tenant(
    base_url: str, session: requests.Session, tenant_name: str
) -> Tuple[bool, dict, str]:
    """Create a new tenant."""
    logger.info(f"  Creating tenant '{tenant_name}'...")
    create_payload = {"title": tenant_name}
    try:
        resp = session.post(f"{base_url}/api/tenant", json=create_payload, timeout=10)

        if resp.status_code not in (200, 201):
            error_msg = f"Failed to create tenant: {resp.status_code}"
            return False, {}, error_msg

        tenant = resp.json()
        logger.info(f"  Tenant '{tenant_name}' created")
        return True, tenant, ""
    except requests.exceptions.RequestException as e:
        return False, {}, f"Network error creating tenant: {e}"
    except requests.exceptions.JSONDecodeError as e:
        return False, {}, f"Invalid JSON response creating tenant: {e}"


def _get_or_create_tenant(
    base_url: str, session: requests.Session, tenant_name: str
) -> Tuple[bool, dict, str]:
    """Get existing tenant or create a new one."""
    try:
        params = {"pageSize": 100, "page": 0, "textSearch": tenant_name}
        tenant, _ = _check_existing_tenant(params, base_url, session)

        if tenant:
            return True, tenant, ""

        return _create_new_tenant(base_url, session, tenant_name)
    except Exception as e:
        return False, {}, f"Exception getting/creating tenant: {e}"


def _check_admin_exists(base_url: str, admin_email: str, admin_password: str) -> bool:
    """Check if admin already exists."""
    logger.info(f"  Checking if admin '{admin_email}' exists...")
    token = login(base_url, admin_email, admin_password)
    if token:
        logger.info(f"  Admin '{admin_email}' already exists and credentials match")
        return True
    return False


def _create_tenant_admin_user(
    base_url: str, session: requests.Session, admin_email: str, tenant_id: str
) -> Tuple[bool, str, str]:
    """Create tenant admin user."""
    logger.info(f"  Creating tenant admin '{admin_email}'...")
    user_payload = {
        "email": admin_email,
        "authority": "TENANT_ADMIN",
        "tenantId": {"id": tenant_id, "entityType": "TENANT"},
    }
    try:
        resp = session.post(
            f"{base_url}/api/user",
            params={"sendActivationMail": "false"},
            json=user_payload,
            timeout=10,
        )

        if resp.status_code not in (200, 201):
            error_msg = f"Failed to create tenant admin: {resp.status_code}"
            return False, "", error_msg

        user = resp.json()
        user_id = user.get("id", {}).get("id")
        if not user_id:
            return False, "", "Created user response missing id"

        return True, user_id, ""
    except requests.exceptions.RequestException as e:
        return False, "", f"Network error creating tenant admin: {e}"
    except requests.exceptions.JSONDecodeError as e:
        return False, "", f"Invalid JSON response creating tenant admin: {e}"


def _get_activation_token(
    base_url: str, session: requests.Session, user_id: str
) -> Tuple[bool, str, str]:
    """Get activation token for user."""
    try:
        resp = session.get(f"{base_url}/api/user/{user_id}/activationLink", timeout=10)
        if resp.status_code != 200:
            error_msg = f"Failed to get activation link: {resp.status_code}"
            return False, "", error_msg

        activation_link = resp.text.strip().strip('"')
        parsed = urlparse(activation_link)
        qs = parse_qs(parsed.query)
        tokens = qs.get("activateToken") or qs.get("activateToken".lower())

        if not tokens:
            return False, "", "Could not extract activateToken from activation link"

        return True, tokens[0], ""
    except requests.exceptions.RequestException as e:
        return False, "", f"Network error getting activation token: {e}"


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


def _create_and_activate_admin(
    base_url: str,
    session: requests.Session,
    admin_email: str,
    admin_password: str,
    tenant_id: str,
) -> Tuple[bool, str]:
    """Create tenant admin user and activate."""
    # Create tenant admin user
    success, user_id, error_msg = _create_tenant_admin_user(
        base_url, session, admin_email, tenant_id
    )
    if not success:
        return False, error_msg

    # Get activation token
    success, activate_token, error_msg = _get_activation_token(
        base_url, session, user_id
    )
    if not success:
        return False, error_msg

    # Activate user
    success, error_msg = _activate_user(base_url, activate_token, admin_password)
    if not success:
        return False, error_msg

    logger.info(f"  Admin '{admin_email}' created and activated")
    return _verify_admin_login(base_url, admin_email, admin_password)


def _ensure_tenant_admin(
    base_url: str,
    session: requests.Session,
    tenant: dict,
    admin_email: str,
    admin_password: str,
) -> Tuple[bool, str]:
    """Create and activate tenant admin user."""
    try:
        tenant_id_obj = tenant.get("id") or {}
        tenant_id = tenant_id_obj.get("id")
        if not tenant_id:
            return False, "Invalid tenant object, missing id"

        # Check if admin already exists
        if _check_admin_exists(base_url, admin_email, admin_password):
            return True, ""

        # Create and activate admin
        return _create_and_activate_admin(
            base_url, session, admin_email, admin_password, tenant_id
        )
    except Exception as e:
        return False, f"Exception creating tenant admin: {e}"


def _create_tenant_and_admin(
    base_url: str,
    session: requests.Session,
    tenant_name: str,
    admin_email: str,
    admin_password: str,
) -> Tuple[bool, str]:
    """Create a tenant and its admin user."""
    success, tenant, error_msg = _get_or_create_tenant(base_url, session, tenant_name)
    if not success:
        return False, error_msg

    return _ensure_tenant_admin(base_url, session, tenant, admin_email, admin_password)


def _process_credentials_row(
    base_url: str, session: requests.Session, credential: dict, seen_emails: set
) -> Tuple[bool, str]:
    """Process a single credential row."""
    username = credential["username"]
    password = credential["password"]
    email = credential.get("email", "").strip()

    # Validate email field
    if not email:
        return False, f"Email field is required for user {username}"

    # Check for duplicate emails
    if email in seen_emails:
        return False, f"Duplicate email '{email}' found for user {username}"
    seen_emails.add(email)

    logger.info(f"\nProcessing user '{username}'...")
    success, error_msg = _create_tenant_and_admin(
        base_url, session, username, email, password
    )

    if not success:
        return False, f"Failed for user {username}: {error_msg}"
    return True, ""


def _process_credentials_file(
    base_url: str, session: requests.Session, credentials_file: Path
) -> Tuple[bool, str]:
    """Process credentials file and create tenants."""
    seen_emails = set()
    with credentials_file.open(mode="r", newline="", encoding="utf-8") as creds_file:
        credentials = csv.DictReader(creds_file, delimiter=",")

        # Validate required columns
        if 'email' not in credentials.fieldnames:
            return False, "Email column is required in credentials.csv"

        for credential in credentials:
            success, error_msg = _process_credentials_row(base_url, session, credential, seen_emails)
            if not success:
                return False, error_msg
    return True, "ThingsBoard users created successfully"


def setup_thingsboard_users() -> Tuple[bool, str]:
    """Add users to ThingsBoard service."""
    base_dir = Config.get_base_dir()
    credentials_file = base_dir / "config" / "credentials.csv"

    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        # Initialize Config to load environment variables
        Config()
        base_url = build_base_url()
        logger.info(f"Using ThingsBoard URL: {base_url}")

        session = requests.Session()
        success, error_msg = change_sysadmin_password_if_needed(base_url, session)
        if not success:
            return False, error_msg

        return _process_credentials_file(base_url, session, credentials_file)
    except (OSError, ValueError, KeyError, requests.exceptions.RequestException) as e:
        return False, f"Error adding ThingsBoard users: {e}"


def _copy_and_chmod_cert(src: Path, dest: Path, mode: int) -> None:
    """Copy certificate and set permissions."""
    shutil.copy2(src, dest)
    os.chmod(dest, mode)


def _set_cert_ownership(cert_path: Path, os_type: str, uid: int, gid: int) -> None:
    """Set certificate ownership if on Unix."""
    if os_type in ("linux", "darwin"):
        shutil.chown(cert_path, user=uid, group=gid)


def _setup_postgres_certs(
    certs_dir: Path, os_type: str, uid: int, gid: int
) -> Tuple[bool, str]:
    """Set up PostgreSQL certificates with proper permissions."""
    try:
        privkey_path = certs_dir / PRIV_KEY_FILENAME
        fullchain_path = certs_dir / FULLCHAIN_FILENAME
        postgres_key_path = certs_dir / "postgres.key"
        postgres_crt_path = certs_dir / "postgres.crt"

        _copy_and_chmod_cert(privkey_path, postgres_key_path, 0o600)
        _copy_and_chmod_cert(fullchain_path, postgres_crt_path, 0o644)
        _set_cert_ownership(postgres_key_path, os_type, uid, gid)
        _set_cert_ownership(postgres_crt_path, os_type, uid, gid)

        if os_type in ("linux", "darwin"):
            return True, f"PostgreSQL certificates created with ownership {uid}:{gid}"
        return True, "PostgreSQL certificates created (ownership not set on Windows)"
    except OSError as e:
        return False, f"Error setting up PostgreSQL certificates: {e}"


def _setup_thingsboard_certs(
    certs_dir: Path, os_type: str, uid: int, gid: int
) -> Tuple[bool, str]:
    """Set up ThingsBoard certificates with proper permissions."""
    try:
        privkey_path = certs_dir / PRIV_KEY_FILENAME
        fullchain_path = certs_dir / FULLCHAIN_FILENAME
        tb_privkey_path = certs_dir / "thingsboard-privkey.pem"
        tb_fullchain_path = certs_dir / "thingsboard-fullchain.pem"

        _copy_and_chmod_cert(privkey_path, tb_privkey_path, 0o600)
        _copy_and_chmod_cert(fullchain_path, tb_fullchain_path, 0o644)
        _set_cert_ownership(tb_privkey_path, os_type, uid, gid)
        _set_cert_ownership(tb_fullchain_path, os_type, uid, gid)

        if os_type in ("linux", "darwin"):
            return True, f"ThingsBoard certificates created with ownership {uid}:{gid}"
        return True, "ThingsBoard certificates created (ownership not set on Windows)"
    except OSError as e:
        return False, f"Error setting up ThingsBoard certificates: {e}"


def _set_directory_ownership(directory: Path, uid: int, gid: int) -> None:
    """Set ownership for directory and all its contents."""
    shutil.chown(directory, user=uid, group=gid)
    for root, dirs, files in os.walk(directory):
        for d in dirs:
            shutil.chown(Path(root) / d, user=uid, group=gid)
        for f in files:
            shutil.chown(Path(root) / f, user=uid, group=gid)


def _setup_thingsboard_directories(
    base_dir: Path, os_type: str, uid: int, gid: int
) -> Tuple[bool, str]:
    """Set up ThingsBoard data and log directories with proper ownership."""
    try:
        data_dir = base_dir / "data" / "thingsboard"
        log_dir = base_dir / "log" / "thingsboard"
        data_dir.mkdir(parents=True, exist_ok=True)
        log_dir.mkdir(parents=True, exist_ok=True)

        if os_type in ("linux", "darwin") and not is_ci():
            _set_directory_ownership(data_dir, uid, gid)
            _set_directory_ownership(log_dir, uid, gid)
            return (
                True,
                f"ThingsBoard data and log directories ownership set to {uid}:{gid}",
            )

        return True, "ThingsBoard data and log directories created (ownership skipped)"
    except OSError as e:
        return False, f"Error setting up ThingsBoard directories: {e}"


def _get_config_values() -> Tuple[Config, Path, str, Path, int, int, int, int]:
    """Get configuration values for ThingsBoard setup."""
    config = Config()
    base_dir = Config.get_base_dir()
    os_type = platform.system().lower()
    host_name = config.get_value("HOSTNAME")
    certs_dir = base_dir / "certs" / host_name

    postgres_uid = int(config.get_value("POSTGRES_UID"))
    postgres_gid = int(config.get_value("POSTGRES_GID"))
    thingsboard_uid = int(config.get_value("THINGSBOARD_UID"))
    thingsboard_gid = int(config.get_value("THINGSBOARD_GID"))

    return (
        config,
        base_dir,
        os_type,
        certs_dir,
        postgres_uid,
        postgres_gid,
        thingsboard_uid,
        thingsboard_gid,
    )


def _verify_certificates_exist(certs_dir: Path) -> Tuple[bool, str]:
    """Verify normalized certificates exist."""
    privkey_path = certs_dir / PRIV_KEY_FILENAME
    fullchain_path = certs_dir / FULLCHAIN_FILENAME

    if not privkey_path.exists() or not fullchain_path.exists():
        return False, f"Normalized certificates not found in {certs_dir}"
    return True, ""


def _execute_setup_operations(setup_params: dict) -> Tuple[bool, list]:
    """Execute all setup operations.

    Args:
        setup_params: Dictionary containing base_dir, os_type, certs_dir,
                      postgres_uid, postgres_gid, thingsboard_uid, thingsboard_gid
    """
    messages = []
    base_dir = setup_params["base_dir"]
    os_type = setup_params["os_type"]
    certs_dir = setup_params["certs_dir"]
    postgres_uid = setup_params["postgres_uid"]
    postgres_gid = setup_params["postgres_gid"]
    thingsboard_uid = setup_params["thingsboard_uid"]
    thingsboard_gid = setup_params["thingsboard_gid"]

    # Set up PostgreSQL certificates
    success, msg = _setup_postgres_certs(certs_dir, os_type, postgres_uid, postgres_gid)
    if not success:
        return False, [msg]
    messages.append(msg)

    # Set up ThingsBoard certificates
    success, msg = _setup_thingsboard_certs(
        certs_dir, os_type, thingsboard_uid, thingsboard_gid
    )
    if not success:
        return False, [msg]
    messages.append(msg)

    # Set up data and log directories
    success, msg = _setup_thingsboard_directories(
        base_dir, os_type, thingsboard_uid, thingsboard_gid
    )
    if not success:
        return False, [msg]
    messages.append(msg)

    return True, messages


def permissions_thingsboard() -> Tuple[bool, str]:
    """Set up certificates and permissions for ThingsBoard and PostgreSQL."""
    try:
        # Obtain TLS certificates first
        success, msg = copy_certs()
        if not success:
            return False, f"Failed to copy certificates: {msg}"

        messages = [msg]

        # Get configuration values
        (
            _,
            base_dir,
            os_type,
            certs_dir,
            postgres_uid,
            postgres_gid,
            thingsboard_uid,
            thingsboard_gid,
        ) = _get_config_values()

        # Verify certificates exist
        success, error_msg = _verify_certificates_exist(certs_dir)
        if not success:
            return False, error_msg

        # Execute setup operations
        setup_params = {
            "base_dir": base_dir,
            "os_type": os_type,
            "certs_dir": certs_dir,
            "postgres_uid": postgres_uid,
            "postgres_gid": postgres_gid,
            "thingsboard_uid": thingsboard_uid,
            "thingsboard_gid": thingsboard_gid,
        }
        success, operation_messages = _execute_setup_operations(setup_params)

        if not success:
            return False, operation_messages[0]

        messages.extend(operation_messages)
        return True, "; ".join(messages)
    except Exception as e:
        return False, f"Unexpected error setting up ThingsBoard: {e}"


def thingsboard_configure() -> Tuple[bool, str]:
    """Configure ThingsBoard users from credentials.csv."""
    logger.info("Configuring ThingsBoard users...")
    success, msg = setup_thingsboard_users()

    if not success:
        return False, f"Error: {msg}"

    logger.info(f"\n{msg}")
    logger.info("ThingsBoard configuration complete!")
    return True, msg
