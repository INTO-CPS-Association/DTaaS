"""This file has functions that handle the user cli commands"""

import os
import subprocess
import shutil
from src.pkg import utils
from pathlib import Path
from src.pkg.constants import COMPOSE_USERS_YML


def _build_config_mapping(user_config, resources):
    """Build the mapping for config substitution.

    Args:
        user_config: Dict with keys 'username', 'path', optionally 'server'
        resources: Dict with resource limits

    Returns:
        Mapping dict for config substitution
    """
    mapping = {
        "${DTAAS_DIR}": user_config["path"],
        "${username}": user_config["username"],
        "${shm_size}": str(resources["shm_size"]),
        "${cpus}": str(resources["cpus"]),
        "${mem_limit}": str(resources["mem_limit"]),
        "${pids_limit}": str(resources["pids_limit"]),
    }
    if user_config.get("server") is not None:
        mapping["${SERVER_DNS}"] = user_config["server"]
    return mapping


def _load_template(server, tls):
    """Load the appropriate template based on server type and TLS.

    Args:
        server: Server DNS name (not 'localhost')
        tls: Whether to use TLS/secure template

    Returns:
        Tuple of (template dict, error if any)
    """
    if server == utils.LOCALHOST_SERVER:
        return None, Exception("user add is not supported for localhost installations")
    if tls:
        return utils.import_yaml("users.server.secure.yml")
    return utils.import_yaml("users.server.yml")


def get_compose_config(username, config):
    """Makes and returns the config for the user

    Args:
        username: Username for the config
        config: Dict with 'server', 'path', 'resources', 'tls' keys

    Returns:
        Tuple of (user config dict, error if any)
    """
    try:
        template, err = _load_template(config["server"], config.get("tls"))
        utils.check_error(err)
        user_config = {
            "username": username,
            "path": config["path"],
            "server": config["server"]
            if config["server"] != utils.LOCALHOST_SERVER
            else None,
        }
        mapping = _build_config_mapping(user_config, config["resources"])
        result, err = utils.replace_all(template, mapping)
        utils.check_error(err)
    except Exception as e:
        return None, e
    return result, None


def create_user_files(users, file_path):
    """Creates all the users' workspace directories"""
    for username in users:
        user_dir = Path(file_path) / username
        shutil.copytree(file_path + "/template", user_dir, dirs_exist_ok=True)
        try:
            shutil.chown(user_dir, user=1000, group=100)
            for item in user_dir.rglob("*"):
                shutil.chown(item, user=1000, group=100)
        except (AttributeError, PermissionError):
            # Skip os.chown in tests to avoid PermissionError
            pass
    return None


def add_users_to_compose(users, compose, config):
    """Adds all the users config to the compose dictionary
    Args:
        users: List of usernames
        compose: Compose dict to update
        config: Dict with 'server', 'path', 'resources' keys
    """
    for username in users:
        user_conf, err = get_compose_config(username, config)
        if err is not None:
            return err
        compose["services"][username] = user_conf
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


def _setup_compose_structure(compose):
    """Ensure compose has required structure for services."""
    if "version" not in compose:
        compose["version"] = "3"
    if "services" not in compose:
        compose["services"] = {}
    if "networks" not in compose:
        compose["networks"] = {"users": {"name": "dtaas-users", "external": True}}


def _get_add_users_config(config_obj):
    """Retrieve configuration needed for adding users."""
    user_list, err = config_obj.get_add_users_list()
    utils.check_error(err)
    server, err = config_obj.get_server_dns()
    utils.check_error(err)
    path, err = config_obj.get_path()
    utils.check_error(err)
    resources, err = config_obj.get_resource_limits()
    utils.check_error(err)
    tls, err = config_obj.get_tls()
    utils.check_error(err)
    return user_list, server, path, resources, tls


def _finalize_compose(compose):
    """Export and start user containers."""
    err = utils.export_yaml(compose, COMPOSE_USERS_YML)
    utils.check_error(err)
    users_list = list(compose["services"].keys())
    err = start_user_containers(users_list)
    utils.check_error(err)


def add_users(config_obj):
    """add cli command handler"""
    try:
        compose, err = utils.import_yaml(COMPOSE_USERS_YML)
        utils.check_error(err)
        user_list, server, path, resources, tls = _get_add_users_config(config_obj)
    except Exception as e:
        return e

    _setup_compose_structure(compose)

    try:
        create_user_files(user_list, path + "/files")
        config = {"server": server, "path": path, "resources": resources, "tls": tls}
        err = add_users_to_compose(user_list, compose, config)
        utils.check_error(err)
        _finalize_compose(compose)
    except Exception as e:
        return e

    return None


def _remove_users_from_compose(compose, user_list):
    """Remove users from compose configuration."""
    for username in user_list:
        if "services" in compose and username in compose["services"]:
            del compose["services"][username]


def delete_user(config_obj):
    """delete cli command handler"""
    try:
        compose, err = utils.import_yaml(COMPOSE_USERS_YML)
        utils.check_error(err)
        user_list, err = config_obj.get_delete_users_list()
        utils.check_error(err)
        err = stop_user_containers(user_list)
        utils.check_error(err)
        _remove_users_from_compose(compose, user_list)
        err = utils.export_yaml(compose, COMPOSE_USERS_YML)
        utils.check_error(err)
    except Exception as e:
        return e

    return None
