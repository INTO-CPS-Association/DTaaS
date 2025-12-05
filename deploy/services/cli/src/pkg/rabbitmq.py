#!/bin/python3
import csv
from pathlib import Path
import subprocess
from typing import Optional, Tuple

def execute_shell_command(command: str, verbose:bool = True) -> str:
    # Execute the command
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if(verbose):
        print("Output:", result.stdout)
    if result.returncode != 0:
        print("Error:", result.stderr)
        return ''
    else:
        return result.stdout

def create_accounts_internal() -> None:
    """This function runs INSIDE the container."""
    csv_file = "credentials.csv"  # Inside container, it's in the same directory
    
    with open(csv_file, mode='r', newline='') as creds_file:
        creds_dict = {}
        credentials = csv.DictReader(creds_file, delimiter=',')
        for credential in credentials:
            creds_dict[credential['username']] = credential['password']
            vhost = credential['username']

            execute_shell_command('rabbitmqctl add_user'+ ' '
                + credential['username'] + ' ' + credential['password'])
            execute_shell_command('rabbitmqctl add_vhost ' + vhost)
            execute_shell_command('rabbitmqctl set_permissions -p'
                + ' ' + vhost + ' ' + credential['username'] + ' '
                + '".*" ".*" ".*"')
            execute_shell_command('rabbitmqctl set_permissions -p'
                + ' ' + '/' + ' ' + credential['username'] + ' '
                + '".*" ".*" ".*"')
    return None


def create_accounts() -> Tuple[Optional[Exception], str]:
    """
    This function runs ON THE HOST and orchestrates the container execution.
    This is called by the CLI.
    """
    base_dir = Path(__file__).parent.parent.parent.parent
    csv_file = base_dir / "config" / "credentials.csv"
    script_file = Path(__file__)  # This current file
    
    if not csv_file.exists():
        return FileNotFoundError(f"CSV not found: {csv_file}"), str(csv_file)
    
    try:
        # Copy this script to container
        result = subprocess.run(
            ["docker", "cp", str(script_file), "rabbitmq:/rabbitmq.py"],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Copy CSV to container
        result = subprocess.run(
            ["docker", "cp", str(csv_file), "rabbitmq:/credentials.csv"],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Execute this script inside container
        result = subprocess.run(
            ["docker", "exec", "rabbitmq", "python3", "/rabbitmq.py"],
            capture_output=True,
            text=True,
            check=True
        )
        
        return None, "Successfully added users to RabbitMQ"
        
    except subprocess.CalledProcessError as e:
        return e, f"Failed to add users: {e.stderr}"
    except FileNotFoundError as e:
        return e, "Docker command not found"
    except Exception as e:
        return e, f"Error: {str(e)}"


if __name__ == "__main__":
    # When run inside container, execute the internal function
    create_accounts_internal()
