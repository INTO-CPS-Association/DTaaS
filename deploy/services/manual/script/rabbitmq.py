#!/bin/python3
import csv
import subprocess

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

def create_accounts(filename: str) -> None:
    with open(filename, mode='r', newline='') as creds_file:
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

if __name__ == "__main__":
    create_accounts("credentials.csv")
