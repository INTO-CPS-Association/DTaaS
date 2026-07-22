"""Compose/container plumbing for provisioning and running user services.

Everything here builds or applies a single user's compose service definition,
or drives 'docker compose' for a set of user containers. See users.py for the
'user add'/'user delete' command orchestration built on top of this.
"""

import subprocess
import shutil
from pathlib import Path
from . import utils
from .constants import COMPOSE_USERS_YML, LOCALHOST_SERVER
from .state import write_state
from .users_utils import build_base_mapping, resource_mapping


def _missing_template_error(name):
    """The error for a template file that is absent or empty."""
    return Exception(
        f"User workspace template '{name}' is missing or empty in this "
        "directory. Run 'dtaas deployment generate --type <type>' here first."
    )


def _load_template(server, tls):
    """Load the appropriate template based on server type and TLS.

    Args:
        server: Server DNS name (not 'localhost')
        tls: Whether to use TLS/secure template

    Returns:
        Tuple of (template dict, error if any)
    """
    if server == LOCALHOST_SERVER:
        return None, Exception("user add is not supported for localhost installations")
    name = "users.server.secure.yml" if tls else "users.server.yml"
    template, err = utils.import_yaml(name)
    if err is not None:
        return None, err
    if not template:
        return None, _missing_template_error(name)
    return template, None


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


def _create_one_user_dir(username, file_path):
    """Copy the template into username's workspace dir and chown it (best-effort)."""
    user_dir = Path(file_path) / username
    shutil.copytree(Path(file_path) / "template", user_dir, dirs_exist_ok=True)
    try:
        shutil.chown(user_dir, user=1000, group=100)
        for item in user_dir.rglob("*"):
            shutil.chown(item, user=1000, group=100)
    except (AttributeError, PermissionError):
        # Skip os.chown in tests to avoid PermissionError
        pass


def create_user_files(users, file_path):
    """Creates all the users' workspace directories"""
    for username in users:
        _create_one_user_dir(username, file_path)
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
    cmd = ["docker", "compose", "-f", COMPOSE_USERS_YML, "up", "-d"]
    return run_command_for_containers(cmd, users)


def stop_user_containers(users):
    """Stops and removes only the named user containers.

    'docker compose down' takes no SERVICE arguments and always tears down the
    whole project, so 'rm --stop --force' is used instead to target just the
    given services.
    """
    cmd = ["docker", "compose", "-f", COMPOSE_USERS_YML, "rm", "--stop", "--force"]
    return run_command_for_containers(cmd, users)


def run_command_for_containers(command, containers):
    """Runs the given docker command (an argv list) for the given containers.

    Invoked with shell=False so usernames are passed as literal argv entries and
    can never be interpreted as shell syntax.
    """
    argv = command + list(containers)
    result = subprocess.run(argv, shell=False, check=False)
    if result.returncode != 0:
        return Exception(f"failed to run '{' '.join(argv)}' command")
    return None


def setup_compose_structure(compose):
    """Ensure compose has required structure for services."""
    if "version" not in compose:
        compose["version"] = "3"
    if "services" not in compose:
        compose["services"] = {}
    if "networks" not in compose:
        compose["networks"] = {"users": {"name": "dtaas-users", "external": True}}


def finalize_compose(compose, skip_start=(), start_only=None):
    """Export compose, start the appropriate user containers, and record state.

    skip_start holds usernames whose registry desired_status is not 'running'
    (set by 'dtaas user pause'/'stop'). Their compose service definition
    is still written, so their config is not lost, but their container is not
    started -- otherwise the idempotent re-provisioning that 'config reconcile
    --fix' does on every run would silently undo the pause.

    start_only further restricts which users are started: None starts every
    service not in skip_start ('config reconcile --fix'); a list starts only
    those names ('user add', so adding one user never recreates the rest).
    """
    err = utils.export_yaml(compose, COMPOSE_USERS_YML)
    utils.check_error(err)
    users_list = [
        name
        for name in compose["services"]
        if name not in skip_start and (start_only is None or name in start_only)
    ]
    # An empty list must not reach 'compose up -d' (no SERVICE args ups the
    # whole project); only start when there is something specific to start.
    if users_list:
        err = start_user_containers(users_list)
        utils.check_error(err)
    write_state(compose["services"])
