"""RabbitMQ user management for DTaaS services"""
import csv
import platform
import subprocess
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
        container_name = command[2]  # "rabbitmq"
        exec_cmd = command[3:]  # ["rabbitmqctl", "add_user", ...]
        result = docker.execute(container_name, exec_cmd)
        if verbose:
            print("Output:", result)
        return True, result
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        if verbose:
            print(error_msg)
        return False, error_msg


def setup_rabbitmq_users() -> tuple[bool, str]:
    """
    Add users to RabbitMQ service.

    Returns:
        Tuple of (success, message)
    """
    credentials_file = Path(__file__).parent.parent.parent.parent / "config" / "credentials.csv"
    if platform.system().lower() in ['linux', 'darwin']:
        credentials_file = Path.cwd().parent / "config" / "credentials.csv"
    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        with credentials_file.open(mode="r", newline="", encoding="utf-8") as creds_file:
            credentials = csv.DictReader(creds_file, delimiter=",")

            for credential in credentials:
                username = credential["username"]
                password = credential["password"]
                vhost = username

                # Add user
                success, output = execute_command([
                    "docker", "exec", "rabbitmq",
                    "rabbitmqctl", "add_user",
                    username, password
                ])

                if not success:
                    print(f"Warning: Could not add user {username}: {output}")

                # Add vhost
                execute_command([
                    "docker", "exec", "rabbitmq",
                    "rabbitmqctl", "add_vhost",
                    vhost
                ])

                # Set permissions on user vhost
                execute_command([
                    "docker", "exec", "rabbitmq",
                    "rabbitmqctl", "set_permissions",
                    "-p", vhost,
                    username,
                    ".*", ".*", ".*"
                ])

                # Set permissions on default vhost
                execute_command([
                    "docker", "exec", "rabbitmq",
                    "rabbitmqctl", "set_permissions",
                    "-p", "/",
                    username,
                    ".*", ".*", ".*"
                ])

        return True, "RabbitMQ users created successfully"

    except (OSError, KeyError) as e:
        return False, f"Error adding RabbitMQ users: {e}"
