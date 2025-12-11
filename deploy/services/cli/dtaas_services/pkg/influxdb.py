"""InfluxDB user management for DTaaS services"""
import csv
import json
import shutil
import platform
from typing import Tuple
from .utils import get_credentials_path, execute_docker_command
from .config import Config


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
        ["influx", "user", "create", "--skip-verify", "-n", username, "-p", password]
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
        "influxdb",
        ["influx", "user", "list", "--skip-verify", "--json"],
        verbose=False
    )

    if not success:
        return False, {}, f"Failed to retrieve user list: {users_json_str}"

    try:
        users_json_list = json.loads(users_json_str)
        users_dict = {user["name"]: user["id"] for user in users_json_list}
        return True, users_dict, ""
    except json.JSONDecodeError as e:
        return False, {}, f"Failed to parse user list JSON: {str(e)}"
    except (KeyError, TypeError) as e:
        return False, {}, f"Unexpected user list format: {str(e)}"


def _setup_user_org_bucket(name: str, user_id: str) -> tuple[bool, str]:
    """
    Set up organization and bucket for a user.
    
    Args:
        name: Organization/bucket name
        user_id: User ID to add as owner
        
    Returns:
        Tuple of (success, error message if any)
    """
    # Create organization
    success, output = execute_docker_command(
        "influxdb",
        ["influx", "org", "create", "--skip-verify", "--name", name, "--description", name]
    )
    if not success:
        return False, f"Failed to create organization {name}: {output}"

    # Add user as owner
    success, output = execute_docker_command(
        "influxdb",
        ["influx", "org", "members", "add", "--skip-verify", "--name", name, "--owner", "-m", user_id]
    )
    if not success:
        return False, f"Failed to add user {user_id} as owner to {name}: {output}"

    # Create bucket
    success, output = execute_docker_command(
        "influxdb",
        ["influx", "bucket", "create", "--skip-verify", "--name", name, "--org", name]
    )
    if not success:
        return False, f"Failed to create bucket {name}: {output}"

    return True, ""


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
            credentials = csv.DictReader(creds_file, delimiter=",")

            # Create all users first
            for credential in credentials:
                username = credential["username"]
                password = credential["password"]
                success, error_msg = _create_influxdb_user(username, password)
                if not success:
                    return False, error_msg

            # Get user list
            success, users_dict, error_msg = _get_influxdb_users()
            if not success:
                return False, error_msg

            # Set up org and bucket for each user
            for name, user_id in users_dict.items():
                success, error_msg = _setup_user_org_bucket(name, user_id)
                if not success:
                    return False, error_msg

        return True, "InfluxDB users created successfully"

    except (OSError, ValueError, KeyError) as e:
        return False, f"Error adding InfluxDB users: {e}"


def permissions_influxdb() -> Tuple[bool, str]:
    """Copy privkey.pem -> privkey-influxdb.pem and change owner.
    
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
        if os_type in ("linux", "darwin"):
            shutil.chown(
                influx_key_path,
                user=influx_uid,
                group=influx_gid
            )
        msg = (
            f"{influx_key_path} created and ownership set to "
            f"{influx_uid}:{influx_gid}."
        )
        return True, msg
    except OSError as e:
        return False, f"Error setting permissions for InfluxDB: {e}"
