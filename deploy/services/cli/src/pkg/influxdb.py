"""InfluxDB user management for DTaaS services"""
import csv
import json
import subprocess
from pathlib import Path


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
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True
        )
        if verbose:
            print("Output:", result.stdout)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        error_msg = f"Error: {e.stderr}"
        if verbose:
            print(error_msg)
        return False, error_msg


def add_influxdb_users(credentials_file: Path) -> tuple[bool, str]:
    """
    Add users to InfluxDB service.

    Args:
        credentials_file: Path to credentials CSV file

    Returns:
        Tuple of (success, message)
    """
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
