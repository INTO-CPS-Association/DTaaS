"""RabbitMQ user management for DTaaS services"""
import csv
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


def _add_rabbitmq_user(username: str, password: str) -> bool:
    """Add a user to RabbitMQ with vhost and permissions."""
    vhost = username

    success, output = execute_command([
        "docker", "exec", "rabbitmq",
        "rabbitmqctl", "add_user",
        username, password
    ])

    if not success:
        print(f"Warning: Could not add user {username}: {output}")
        return False

    execute_command([
        "docker", "exec", "rabbitmq",
        "rabbitmqctl", "add_vhost",
        vhost
    ])

    execute_command([
        "docker", "exec", "rabbitmq",
        "rabbitmqctl", "set_permissions",
        "-p", vhost,
        username,
        ".*", ".*", ".*"
    ])

    execute_command([
        "docker", "exec", "rabbitmq",
        "rabbitmqctl", "set_permissions",
        "-p", "/",
        username,
        ".*", ".*", ".*"
    ])

    return True


def setup_rabbitmq_users() -> tuple[bool, str]:
    """
    Add users to RabbitMQ service.

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
                _add_rabbitmq_user(username, password)

        return True, "RabbitMQ users created successfully"

    except (OSError, KeyError) as e:
        return False, f"Error adding RabbitMQ users: {e}"
