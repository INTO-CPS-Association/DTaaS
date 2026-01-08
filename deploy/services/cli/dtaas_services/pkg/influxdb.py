"""InfluxDB user management for DTaaS services"""

import csv
import json
import shutil
import platform
from typing import Tuple
from .utils import get_credentials_path, execute_docker_command
from .config import Config
from .utils import is_ci


def _parse_json_response(json_str: str) -> tuple[bool, any, str]:
    """Parse JSON response.
    Args:
        json_str: JSON string to parse
    Returns:
        Tuple of (success, parsed data, error message)
    """
    try:
        data = json.loads(json_str)
        return True, data, ""
    except json.JSONDecodeError as e:
        return False, None, f"Failed to parse JSON: {str(e)}"
    except (KeyError, TypeError) as e:
        return False, None, f"Unexpected data format: {str(e)}"


def _execute_influxdb_command(command: list, error_context: str) -> tuple[bool, str]:
    """Execute an InfluxDB docker command and return error if it fails.
    Args:
        command: Command list to execute
        error_context: Error message context
    Returns:
        Tuple of (success, error message if any)
    """
    success, output = execute_docker_command("influxdb", command)
    if not success:
        return False, f"{error_context}: {output}"
    return True, ""


def _create_influxdb_user(username: str, password: str) -> tuple[bool, str]:
    """
    Create a single InfluxDB user.
    Args:
        username: InfluxDB username
        password: InfluxDB password
    Returns:
        Tuple of (success, error message if any)
    """
    success, output = execute_docker_command(
        "influxdb",
        ["influx", "user", "create", "--skip-verify", "-n", username, "-p", password],
    )

    if not success:
        return False, f"Failed to create user {username}: {output}"
    return True, ""


def _get_influxdb_users() -> tuple[bool, dict, str]:
    """
    Get list of InfluxDB users as a dictionary.

    Returns:
        Tuple of (success, users dict, error message if any)
    """
    success, users_json_str = execute_docker_command(
        "influxdb", ["influx", "user", "list", "--skip-verify", "--json"], verbose=False)
    if not success:
        return False, {}, f"Failed to retrieve user list: {users_json_str}"
    success, users_json_list, error_msg = _parse_json_response(users_json_str)
    if not success:
        return False, {}, error_msg
    users_dict = {user["name"]: user["id"] for user in users_json_list}
    return True, users_dict, ""


def _get_existing_orgs() -> tuple[bool, set, str]:
    """
    Get set of existing organization names in InfluxDB.

    Returns:
        Tuple of (success, set of org names, error message if any)
    """
    success, orgs_json_str = execute_docker_command(
        "influxdb", ["influx", "org", "list", "--skip-verify", "--json"], verbose=False)
    if not success:
        return False, set(), f"Failed to retrieve org list: {orgs_json_str}"
    success, orgs_json_list, error_msg = _parse_json_response(orgs_json_str)
    if not success:
        return False, set(), error_msg
    org_names = {org["name"] for org in orgs_json_list}
    return True, org_names, ""


def _setup_user_org_bucket(
    name: str, user_id: str, existing_orgs: set
) -> tuple[bool, str]:
    """
    Set up organization and bucket for a user.

    Args:
        name: Organization/bucket name (typically the username)
        user_id: User ID to add as owner
        existing_orgs: Set of existing organization names

    Returns:
        Tuple of (success, error message if any)
    """
    # Create organization only if it doesn't exist
    if name not in existing_orgs:
        success, error_msg = _execute_influxdb_command(
            ["influx", "org", "create", "--skip-verify", "--name", name, "--description", name],
            f"Failed to create organization {name}")
        if not success:
            return False, error_msg
    # Add user as owner to organization
    success, error_msg = _execute_influxdb_command(
        ["influx", "org", "members", "add", "--skip-verify", "--name",
         name, "--owner", "-m", user_id],
        f"Failed to add user {user_id} as owner to {name}")
    if not success:
        return False, error_msg
    # Create bucket
    success, error_msg = _execute_influxdb_command(
        ["influx", "bucket", "create", "--skip-verify", "--name", name, "--org", name],
        f"Failed to create bucket {name}")
    return success, error_msg


def _create_users_from_credentials(credentials_file) -> tuple[bool, str]:
    """Create all users from credentials file."""
    credentials = csv.DictReader(credentials_file, delimiter=",")
    for credential in credentials:
        username = credential["username"]
        password = credential["password"]
        success, error_msg = _create_influxdb_user(username, password)
        if not success:
            return False, error_msg
    return True, ""


def _setup_user_organizations(users_dict: dict, existing_orgs: set) -> tuple[bool, str]:
    """Set up organization and bucket for each user."""
    for name, user_id in users_dict.items():
        success, error_msg = _setup_user_org_bucket(name, user_id, existing_orgs)
        if not success:
            return False, error_msg
    return True, ""


def _fetch_influxdb_data() -> tuple[bool, dict, set, str]:
    """Fetch user and organization data from InfluxDB.

    Returns:
        Tuple of (success, users_dict, existing_orgs, error message if any)
    """
    # Get user list
    success, users_dict, error_msg = _get_influxdb_users()
    if not success:
        return False, {}, set(), error_msg
    # Get existing organizations to avoid conflicts
    success, existing_orgs, error_msg = _get_existing_orgs()
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
    success, error_msg = _create_users_from_credentials(creds_file)
    if not success:
        return False, error_msg
    # Fetch user and org data
    success, users_dict, existing_orgs, error_msg = _fetch_influxdb_data()
    if not success:
        return False, error_msg
    # Set up org and bucket for each user
    return _setup_user_organizations(users_dict, existing_orgs)


def setup_influxdb_users() -> tuple[bool, str]:
    """
    Add users to InfluxDB service.

    Returns:
        Tuple of (success, message)
    """
    credentials_file = get_credentials_path()
    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"
    try:
        with credentials_file.open(
            mode="r", newline="", encoding="utf-8"
        ) as creds_file:
            success, error_msg = _execute_setup_steps(creds_file)
            return (True, "InfluxDB users created successfully") if success else (False, error_msg)
    except (OSError, ValueError, KeyError) as e:
        return False, f"Error adding InfluxDB users: {e}"


def permissions_influxdb() -> Tuple[bool, str]:
    """Copy privkey.pem -> privkey-influxdb.pem and change owner.

    Skips permission changes in CI environments (GITHUB_ACTIONS, GITLAB_CI, CI env vars).

    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        os_type = platform.system().lower()
        host_name = config.get_value("HOSTNAME")
        certs_dir = base_dir / "certs" / host_name
        privkey_path = certs_dir / "privkey.pem"
        influx_key_path = certs_dir / "privkey-influxdb.pem"
        influx_uid = int(config.get_value("INFLUX_UID"))
        influx_gid = int(config.get_value("INFLUX_GID"))

        shutil.copy2(privkey_path, influx_key_path)

        # Skip permission changes in CI environments (they're read-only)
        if os_type in ("linux", "darwin") and not is_ci():
            shutil.chown(influx_key_path, user=influx_uid, group=influx_gid)
            msg = (
                f"{influx_key_path} created and ownership set to "
                f"{influx_uid}:{influx_gid}."
            )
        else:
            msg = f"{influx_key_path} created (permission changes skipped in CI)."
        return True, msg
    except OSError as e:
        return False, f"Error setting permissions for InfluxDB: {e}"
