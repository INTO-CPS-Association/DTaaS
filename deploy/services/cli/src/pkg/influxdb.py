"""InfluxDB user management for DTaaS services"""
import csv
import json
from pathlib import Path
from python_on_whales import DockerClient
from .config import Config


def _get_credentials_path() -> Path:
    """Get the path to credentials.csv file."""
    base_dir = Config.get_base_dir()
    return base_dir / "config" / "credentials.csv"


def execute_command(
    command: list[str], verbose: bool = True
) -> tuple[bool, str]:
    """
    Execute a shell command.
    
    Args:
        command: Command to execute as a list
        verbose: Whether to print output
        
    Returns:
        Tuple of (success, output/error message)
    """
    try:
        docker = DockerClient()
        container_name = command[2]  # "influxdb"
        exec_cmd = command[3:]  # ["influx", "user", "create", ...]
        result = docker.execute(container_name, exec_cmd)
        if verbose:
            print("Output:", result)
        return True, result
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        if verbose:
            print(error_msg)
        return False, error_msg


def _create_influxdb_user(username: str, password: str) -> bool:
    """Create a single InfluxDB user."""
    success, output = execute_command([
        "docker", "exec", "influxdb",
        "influx", "user", "create",
        "--skip-verify",
        "-n", username,
        "-p", password
    ])

    if not success:
        print(f"Warning: Could not create user {username}: {output}")
        return False
    return True


def _get_influxdb_users() -> tuple[bool, dict]:
    """Get list of InfluxDB users as a dictionary."""
    success, users_json_str = execute_command([
        "docker", "exec", "influxdb",
        "influx", "user", "list",
        "--skip-verify",
        "--json"
    ], verbose=False)

    if not success:
        return False, {}

    users_json_list = json.loads(users_json_str)
    users_dict = {user["name"]: user["id"] for user in users_json_list}
    return True, users_dict


def _setup_user_org_bucket(name: str, user_id: str) -> None:
    """Set up organization and bucket for a user."""
    execute_command([
        "docker", "exec", "influxdb",
        "influx", "org", "create",
        "--skip-verify",
        "--name", name,
        "--description", name
    ])

    execute_command([
        "docker", "exec", "influxdb",
        "influx", "org", "members", "add",
        "--skip-verify",
        "--name", name,
        "--owner",
        "-m", user_id
    ])

    execute_command([
        "docker", "exec", "influxdb",
        "influx", "bucket", "create",
        "--skip-verify",
        "--name", name,
        "--org", name
    ])


def setup_influxdb_users() -> tuple[bool, str]:
    """
    Add users to InfluxDB service.

    Returns:
        Tuple of (success, message)
    """
    credentials_file = _get_credentials_path()
    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        with credentials_file.open(
            mode="r", newline="", encoding="utf-8"
        ) as creds_file:
            credentials = csv.DictReader(creds_file, delimiter=",")

            for credential in credentials:
                username = credential["username"]
                password = credential["password"]
                _create_influxdb_user(username, password)

            success, users_dict = _get_influxdb_users()
            if not success:
                return False, "Could not retrieve user list"

            for name, user_id in users_dict.items():
                _setup_user_org_bucket(name, user_id)

        return True, "InfluxDB users created successfully"

    except (OSError, ValueError, KeyError) as e:
        return False, f"Error adding InfluxDB users: {e}"
