"""InfluxDB service management."""

import shutil
from typing import Tuple
from ...utils import (
    process_credentials_file,
    create_users_from_credentials,
)
from ...config import Config
from ...cert import set_service_cert_permissions, CertPermissionContext
from .user_management import (
    setup_user_organizations,
    get_existing_orgs,
    get_influxdb_users,
    create_influxdb_user,
)


def _fetch_influxdb_data() -> tuple[bool, dict, set, str]:
    """Fetch user and organization data from InfluxDB.

    Returns:
        Tuple of (success, users_dict, existing_orgs, error message if any)
    """
    # Get user list
    success, users_dict, error_msg = get_influxdb_users()
    if not success:
        return False, {}, set(), error_msg
    # Get existing organizations to avoid conflicts
    success, existing_orgs, error_msg = get_existing_orgs()
    if not success:
        return False, {}, set(), error_msg
    return True, users_dict, existing_orgs, ""


def _execute_setup_steps(creds_file) -> tuple[bool, str]:
    """Execute all setup steps for InfluxDB users.

    Args:
        creds_file: Opened credentials file

    Returns:
        Tuple of (success, error message if any)
    """
    # Create all users first
    success, error_msg = create_users_from_credentials(creds_file, create_influxdb_user)
    if not success:
        return False, error_msg
    # Fetch user and org data
    success, users_dict, existing_orgs, error_msg = _fetch_influxdb_data()
    if not success:
        return False, error_msg
    # Set up org and bucket for each user
    return setup_user_organizations(users_dict, existing_orgs)


def setup_influxdb_users() -> tuple[bool, str]:
    """
    Add users to InfluxDB service.

    Returns:
        Tuple of (success, message)
    """
    return process_credentials_file(
        _execute_setup_steps,
        "InfluxDB",
        "InfluxDB users created successfully",
    )


def permissions_influxdb() -> Tuple[bool, str]:
    """Copy privkey.pem -> privkey-influxdb.pem and change owner.

    Skips permission changes in CI environments (GITHUB_ACTIONS, GITLAB_CI, CI env vars).

    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        host_name = config.get_value("HOSTNAME")
        certs_dir = base_dir / "certs" / host_name
        privkey_path = certs_dir / "privkey.pem"
        influx_key_path = certs_dir / "privkey-influxdb.pem"
        influx_uid = int(config.get_value("INFLUX_UID"))
        influx_gid = int(config.get_value("INFLUX_GID"))

        # Verify source file exists before attempting copy
        if not privkey_path.exists():
            return False, f"Source certificate not found: {privkey_path}"

        shutil.copy2(privkey_path, influx_key_path)

        # Set permissions on InfluxDB private key
        ctx = CertPermissionContext(
            "InfluxDB", influx_key_path, influx_uid, influx_gid, 0o600
        )
        return set_service_cert_permissions(ctx)
    except OSError as e:
        return False, f"Error setting permissions for InfluxDB: {e}"
