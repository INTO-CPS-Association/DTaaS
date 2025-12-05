"""RabbitMQ user management for DTaaS services"""
import csv
import subprocess
from pathlib import Path
from typing import List, Tuple


def execute_command(command: List[str], verbose: bool = True) -> Tuple[bool, str]:
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


def add_rabbitmq_users(credentials_file: Path) -> Tuple[bool, str]:
    """
    Add users to RabbitMQ service.

    Args:
        credentials_file: Path to credentials CSV file

    Returns:
        Tuple of (success, message)
    """
    if not credentials_file.exists():
        return False, f"Credentials file not found: {credentials_file}"

    try:
        with open(credentials_file, mode='r', newline='', encoding='utf-8') as creds_file:
            credentials = csv.DictReader(creds_file, delimiter=',')

            for credential in credentials:
                username = credential['username']
                password = credential['password']
                vhost = username

                # Add user
                success, output = execute_command([
                    'docker', 'exec', 'rabbitmq',
                    'rabbitmqctl', 'add_user',
                    username, password
                ])

                if not success:
                    print(f"Warning: Could not add user {username}: {output}")

                # Add vhost
                execute_command([
                    'docker', 'exec', 'rabbitmq',
                    'rabbitmqctl', 'add_vhost',
                    vhost
                ])

                # Set permissions on user vhost
                execute_command([
                    'docker', 'exec', 'rabbitmq',
                    'rabbitmqctl', 'set_permissions',
                    '-p', vhost,
                    username,
                    '.*', '.*', '.*'
                ])

                # Set permissions on default vhost
                execute_command([
                    'docker', 'exec', 'rabbitmq',
                    'rabbitmqctl', 'set_permissions',
                    '-p', '/',
                    username,
                    '.*', '.*', '.*'
                ])

        return True, "RabbitMQ users created successfully"

    except Exception as e:
        return False, f"Error adding RabbitMQ users: {e}"
