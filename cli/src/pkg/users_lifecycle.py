"""Per-user pause/stop/resume for specific additional users, as siblings to
'user add'/'user delete'. Unlike lifecycle.py's whole-installation commands,
these target a subset of compose.users.yml's services by username.

Each action scopes 'docker compose pause'/'stop'/'unpause' to the targeted
services, records the intended state in dtaas.users.registry.json's
'desired_status' (so 'user add'/'config reconcile --fix' won't silently
restart them), and refreshes .dtaas.state.json. Rejecting a dtaas.toml
starting user is the caller's job (cmd_utils.reject_starting_users).
"""

from . import deploy, utils
from .constants import COMPOSE_USERS_YML
from .registry import load_registry, set_desired_status
from .state import write_state


# pylint: disable=protected-access


def _load_services():
    """Return compose.users.yml's service definitions, or {} when absent."""
    compose, err = utils.import_yaml(COMPOSE_USERS_YML)
    utils.check_error(err)
    services = (compose or {}).get("services", {})
    return services if isinstance(services, dict) else {}


def _split_targets(usernames, services):
    """Split usernames into (provisioned, unregistered, not_provisioned).

    'unregistered' usernames are not in dtaas.users.registry.json at all;
    'not_provisioned' are registered but have no compose.users.yml service yet
    (e.g. 'user add' was never run for them).
    """
    registry = load_registry()
    unregistered = [name for name in usernames if name not in registry]
    known = [name for name in usernames if name in registry]
    provisioned = [name for name in known if name in services]
    not_provisioned = [name for name in known if name not in services]
    return provisioned, unregistered, not_provisioned


def _apply(usernames, compose_action, desired_status):
    """Resolve targets, run *compose_action(targets)* if any, then refresh
    .dtaas.state.json and the registry's desired_status for the ones acted on.

    Returns (acted, unregistered, not_provisioned) usernames. Raises
    DockerException if the compose command itself fails.
    """
    services = _load_services()
    targets, unregistered, not_provisioned = _split_targets(usernames, services)
    if targets:
        compose_action(targets)
        write_state(services)
        set_desired_status(targets, desired_status)
    return targets, unregistered, not_provisioned


def _pause_targets(targets):
    """Freeze the given services in place ('compose pause')."""
    client = deploy._users_client(".")
    if client is not None:
        client.compose.pause(services=targets)


def _stop_targets(targets):
    """Terminate the given services in place, keeping the containers ('compose stop')."""
    client = deploy._users_client(".")
    if client is not None:
        client.compose.stop(services=targets)


def _paused_service_name(container):
    """The compose service name for *container* (fallback: its container name)."""
    labels = container.config.labels
    return (
        labels.get("com.docker.compose.service", container.name)
        if labels
        else container.name
    )


def _split_by_paused(client, targets):
    """Split *targets* into (paused, other) from their live container state.

    'unpause' only works on paused containers and 'start' only on stopped
    ones, so resume must dispatch each target to the right verb rather than
    using one uniformly, unlike pause/stop.
    """
    paused, other = [], []
    for container in client.compose.ps(services=targets, all=True):
        name = _paused_service_name(container)
        (paused if container.state.paused else other).append(name)
    return paused, other


def _resume_targets(targets):
    """Unpause paused services and start stopped ones ('compose unpause'/'start')."""
    client = deploy._users_client(".")
    if client is None:
        return
    paused, other = _split_by_paused(client, targets)
    if paused:
        client.compose.unpause(services=paused)
    if other:
        client.compose.start(services=other)


def pause_users(usernames):
    """Pause the named additional users' containers ('compose pause')."""
    return _apply(usernames, _pause_targets, "paused")


def stop_users(usernames):
    """Stop the named additional users' containers in place ('compose stop')."""
    return _apply(usernames, _stop_targets, "stopped")


def resume_users(usernames):
    """Resume the named additional users, unpausing paused containers and
    starting stopped ones ('compose unpause'/'start' as appropriate).
    """
    return _apply(usernames, _resume_targets, "running")
