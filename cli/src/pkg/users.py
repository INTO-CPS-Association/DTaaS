"""This file has functions that handle the user cli commands"""

import subprocess
import shutil
from pathlib import Path
from . import utils
from .constants import COMPOSE_USERS_YML
from .users_utils import (
    add_conf_server_entry,
    remove_conf_server_entry,
    categorize_users,
    report_missing_users,
    remove_users_from_compose,
    build_base_mapping,
    resource_mapping,
)


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


def _apply_resource_limits(service, config):
    """Merge substituted resource limits into the service dict when enabled.

    When set_limits is false the service is returned unchanged so the container
    runs without CPU/memory/process caps. Raises on a template load or
    substitution error.
    """
    if not config.get("set_limits", True):
        return service
    template, err = utils.import_yaml("users.resources.yml")
    utils.check_error(err)
    resources, err = utils.replace_all(template, resource_mapping(config["resources"]))
    utils.check_error(err)
    service.update(resources)
    return service


def get_compose_config(username, config):
    """Makes and returns the config for the user

    Args:
        username: Username for the config
        config: Dict with 'server', 'path', 'resources', 'tls', 'set_limits' keys

    Returns:
        Tuple of (user config dict, error if any)
    """
    try:
        template, err = _load_template(config["server"], config.get("tls"))
        utils.check_error(err)
        mapping = build_base_mapping(username, config)
        result, err = utils.replace_all(template, mapping)
        utils.check_error(err)
        result = _apply_resource_limits(result, config)
    except Exception as e:
        return None, e
    return result, None


def create_user_files(users, file_path):
    """Creates all the users' workspace directories"""
    for username in users:
        user_dir = Path(file_path) / username
        shutil.copytree(Path(file_path) / "template", user_dir, dirs_exist_ok=True)
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
    set_limits, err = config_obj.get_set_limits()
    utils.check_error(err)
    return user_list, server, path, resources, tls, set_limits


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
        user_list, server, path, resources, tls, set_limits = _get_add_users_config(
            config_obj
        )
        users_section, err = config_obj.get_users()
        utils.check_error(err)
    except Exception as e:
        return e

    _setup_compose_structure(compose)

    try:
        create_user_files(user_list, path + "/files")
        config = {
            "server": server,
            "path": path,
            "resources": resources,
            "tls": tls,
            "set_limits": set_limits,
        }
        err = add_users_to_compose(user_list, compose, config)
        utils.check_error(err)
        # Authorise each user in the forward-auth config before starting their
        # container. Writing conf.server first means a later 'compose up'
        # failure cannot leave the forward-auth rules stale.
        for username in user_list:
            section = (users_section or {}).get(username, {})
            email = str(
                section.get("email", "") if isinstance(section, dict) else ""
            ).strip()
            if any(c in username for c in ("\n", "\r")) or any(
                c in email for c in ("\n", "\r")
            ):
                raise ValueError(
                    f"Invalid user config for '{username}': username/email must not contain newlines"
                )
            add_conf_server_entry(username, email)
        _finalize_compose(compose)
    except Exception as e:
        return e

    return None


def delete_user(config_obj):
    """delete cli command handler"""
    try:
        compose, err = utils.import_yaml(COMPOSE_USERS_YML)
        utils.check_error(err)
        if compose is None:
            return Exception("Failed to load compose configuration")
        user_list, err = config_obj.get_delete_users_list()
        utils.check_error(err)
        existing_services = compose.get("services", {})
        existing, missing = categorize_users(user_list, existing_services)
        report_missing_users(missing)
        if existing:
            err = stop_user_containers(existing)
            utils.check_error(err)
        remove_users_from_compose(compose, existing)
        err = utils.export_yaml(compose, COMPOSE_USERS_YML)
        utils.check_error(err)
        for username in existing:
            remove_conf_server_entry(username)
    except Exception as e:
        return e

    return None
