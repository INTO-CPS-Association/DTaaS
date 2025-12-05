#!/bin/python3
import csv
import json
from pathlib import Path
import subprocess
from typing import Optional, Tuple

def execute_shell_command(command: str, verbose:bool = True) -> str:
    # Execute the command
    result = subprocess.run(command, shell=True,
                 capture_output=True, text=True)
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
            username = credential['username']
            password = credential['password']
            creds_dict[username] = password
            execute_shell_command('influx user create --skip-verify -n'
                + ' ' + username + ' ' + '-p' + ' ' + password)

        users_json_list = json.loads(execute_shell_command(
            'influx user list --skip-verify --json', verbose=False))
        users_json = { user_json['name']: user_json['id'] for user_json in users_json_list}
        print(users_json)

        for name,id in users_json.items():
            execute_shell_command('influx org create --skip-verify --name'
                + ' ' + name + ' ' + '--description' + ' ' + name)
            print(name)
            print(id)
            execute_shell_command(
                'influx org members add --skip-verify --name' + ' '
                 + name + ' ' + '--owner --m' + ' ' + id)
            execute_shell_command(
                'influx bucket create --skip-verify --name'
                 + ' ' + name + ' ' + '--org' + ' ' + name)

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
            ["docker", "cp", str(script_file), "influxdb:/influxdb.py"],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Copy CSV to container
        result = subprocess.run(
            ["docker", "cp", str(csv_file), "influxdb:/credentials.csv"],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Execute this script inside container
        # When run inside container, it will call create_accounts_internal()
        result = subprocess.run(
            ["docker", "exec", "influxdb", "python3", "/influxdb.py"],
            capture_output=True,
            text=True,
            check=True
        )
        
        return None, "Successfully added users to InfluxDB"
        
    except subprocess.CalledProcessError as e:
        return e, f"Failed to add users: {e.stderr}"
    except FileNotFoundError as e:
        return e, "Docker command not found"
    except Exception as e:
        return e, f"Error: {str(e)}"


if __name__ == "__main__":
    # When run inside container, execute the internal function
    create_accounts_internal()
