"""This file has functions that handle the user cli commands"""

import subprocess
import shutil
from src.pkg import utils
from src.pkg.constants import COMPOSE_USERS_YML

def get_compose_config(username, server, path, resources):
    """Makes and returns the config for the user"""

    template = {}
    mapping = {
        "${DTAAS_DIR}": path,
        "${username}": username,
        "${shm_size}": str(resources["shm_size"]),
        "${cpus}": str(resources["cpus"]),
        "${mem_limit}": str(resources["mem_limit"]),
        "${pids_limit}": str(resources["pids_limit"])

    }
    try:
        if server == utils.LOCALHOST_SERVER:
            template, err = utils.import_yaml("users.local.yml")
            utils.check_error(err)

        else:
            template, err = utils.import_yaml("users.server.yml")
            utils.check_error(err)
            mapping["${SERVER_DNS}"] = server

        config, err = utils.replace_all(template, mapping)
        utils.check_error(err)
    except Exception as e:
        return None, e

    return config, None


def create_user_files(users, file_path):
    """Creates all the users' workspace directories"""
    for username in users:
        shutil.copytree(
            file_path + "/template", file_path + "/" + username, dirs_exist_ok=True
        )


def add_users_to_compose(users, compose, server, path, resources):
    """Adds all the users config to the compose dictionary"""
    for username in users:
        config, err = get_compose_config(username, server, path, resources)
        if err is not None:
            return err
        compose["services"][username] = config
    return None


def start_user_containers(users):
    """Starts all the user containers in the 'users' list"""

    cmd = "docker compose -f compose.users.yml up -d"
    err = run_command_for_containers(cmd, users)
    return err


def stop_user_containers(users):
    """Stops all the user containers in the 'users' list"""

    cmd = "docker compose -f compose.users.yml down"
    err = run_command_for_containers(cmd, users)
    return err


def run_command_for_containers(command, containers):
    """Runs the given docker command for the given containers"""
    cmd = [command]
    for name in containers:
        cmd.append(name)

    cmd_str = " ".join(cmd)
    result = subprocess.run(cmd_str, shell=True, check=False)
    if result.returncode != 0:
        return Exception(f"failed to run '{cmd_str}' command")
    return None


def add_users(config_obj):
    """add cli command handler"""
    try:
        compose, err = utils.import_yaml(COMPOSE_USERS_YML)
        utils.check_error(err)
        user_list, err = config_obj.get_add_users_list()
        utils.check_error(err)
        server, err = config_obj.get_server_dns()
        utils.check_error(err)
        path, err = config_obj.get_path()
        utils.check_error(err)
    except Exception as e:
        return e

    if "version" not in compose:
        compose["version"] = "3"
    if "services" not in compose:
        compose["services"] = {}
    if "networks" not in compose:
        compose["networks"] = {"users": {"name": "dtaas-users", "external": True}}

    try:
        create_user_files(user_list, path + "/files")
        resources, err = config_obj.get_resource_limits()
        utils.check_error(err)
        err = add_users_to_compose(user_list, compose, server, path, resources)
        utils.check_error(err)
        err = utils.export_yaml(compose, COMPOSE_USERS_YML)
        utils.check_error(err)
        err = start_user_containers(user_list)
        utils.check_error(err)
    except Exception as e:
        return e

    return None


def delete_user(config_obj):
    """delete cli command handler"""
    try:
        compose, err = utils.import_yaml(COMPOSE_USERS_YML)
        utils.check_error(err)
        user_list, err = config_obj.get_delete_users_list()
        utils.check_error(err)
        err = stop_user_containers(user_list)
        utils.check_error(err)

        for username in user_list:
            if "services" in compose and username in compose["services"]:
                del compose["services"][username]

        err = utils.export_yaml(compose, COMPOSE_USERS_YML)
        utils.check_error(err)

    except Exception as e:
        return e

    return None
