"""InfluxDB user management for DTaaS services"""
import csv
import json
import platform
from pathlib import Path
from python_on_whales import DockerClient

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


def setup_influxdb_users() -> tuple[bool, str]:
    """
    Add users to InfluxDB service.

    Returns:
        Tuple of (success, message)
    """
    base_dir = Path(__file__).parent.parent.parent.parent
    if platform.system().lower() in ['linux', 'darwin']:
        base_dir = Path.cwd().parent
    
    credentials_file = base_dir / "config" / "credentials.csv"
    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        with credentials_file.open(mode="r", newline="", encoding="utf-8") as creds_file:
            credentials = csv.DictReader(creds_file, delimiter=",")

            for credential in credentials:
                username = credential["username"]
                password = credential["password"]

                # Create user
                success, output = execute_command([
                    "docker", "exec", "influxdb",
                    "influx", "user", "create",
                    "--skip-verify",
                    "-n", username,
                    "-p", password
                ])

                if not success:
                    print(f"Warning: Could not create user {username}: {output}")
                    continue

            # Get list of users
            success, users_json_str = execute_command([
                "docker", "exec", "influxdb",
                "influx", "user", "list",
                "--skip-verify",
                "--json"
            ], verbose=False)

            if not success:
                return False, "Could not retrieve user list"

            users_json_list = json.loads(users_json_str)
            users_dict = {user["name"]: user["id"] for user in users_json_list}

            # Create organizations and buckets for each user
            for name, user_id in users_dict.items():
                # Create organization
                execute_command([
                    "docker", "exec", "influxdb",
                    "influx", "org", "create",
                    "--skip-verify",
                    "--name", name,
                    "--description", name
                ])

                # Add user as owner to organization
                execute_command([
                    "docker", "exec", "influxdb",
                    "influx", "org", "members", "add",
                    "--skip-verify",
                    "--name", name,
                    "--owner",
                    "-m", user_id
                ])

                # Create bucket for user
                execute_command([
                    "docker", "exec", "influxdb",
                    "influx", "bucket", "create",
                    "--skip-verify",
                    "--name", name,
                    "--org", name
                ])

        return True, "InfluxDB users created successfully"

    except (OSError, ValueError, KeyError) as e:
        return False, f"Error adding InfluxDB users: {e}"
