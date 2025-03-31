#!/bin/python3
import csv
import json
import subprocess

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

def create_accounts(filename: str) -> None:
    with open(filename, mode='r', newline='') as creds_file:
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

if __name__ == "__main__":
    create_accounts("credentials.csv")
