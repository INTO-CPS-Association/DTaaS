"""Per-user pause/stop/resume for specific additional users, as siblings to
'user add'/'user delete'. Unlike lifecycle.py's whole-installation commands,
these target a subset of compose.users.yml's services by username.

Each action scopes 'docker compose pause'/'stop'/'unpause' to the targeted
services, records the intended state in dtaas.users.registry.json's
'desired_status' (so 'user add'/'config reconcile --fix' won't silently
restart them), and refreshes .dtaas.state.json. Rejecting a dtaas.toml
starting user is the caller's job (cmd_user_utils.reject_starting_users).
"""

from pathlib import Path
from python_on_whales.exceptions import DockerException
from . import deploy, utils
from .constants import COMPOSE_USERS_YML, REGISTRY_FILE
from .registry import load_registry, set_desired_status
from .state import write_state


# pylint: disable=protected-access
def _load_services(output_dir="."):
    """Return compose.users.yml's service definitions for *output_dir*, or {}
    when absent. Defaults to the current directory for the pause/stop/resume/
    enforce_desired_status call sites, which always act on the current
    directory (see desired_status_drift/missing_containers for the
    --output-dir-aware reporting call sites)."""
    compose, err = utils.import_yaml(str(Path(output_dir) / COMPOSE_USERS_YML))
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


def _service_name(container):
    """The compose service name for *container* (fallback: its container name)."""
    labels = container.config.labels
    return (
        labels.get("com.docker.compose.service", container.name)
        if labels
        else container.name
    )


def _container_state(container):
    """One state word for a live container: paused / running / stopped / ...

    Docker's 'exited' is reported as 'stopped' to match the desired_status
    vocabulary (running/paused/stopped).
    """
    if container.state.paused:
        return "paused"
    status = container.state.status or "unknown"
    return "stopped" if status == "exited" else status


def _live_states(client, targets):
    """{service: state} for *targets*, read from their live containers.

    Returns {} for an empty target list: 'compose ps' with no service filter
    would otherwise list the whole project.
    """
    if not targets:
        return {}
    states = {}
    for container in client.compose.ps(services=list(targets), all=True):
        states[_service_name(container)] = _container_state(container)
    return states


def _pause_targets(targets):
    """Freeze only the currently-running targets ('compose pause').

    Already-paused (or stopped) containers are skipped, since 'compose pause'
    errors on a container that is not running.
    """
    client = deploy._users_client(".")
    if client is None:
        return
    states = _live_states(client, targets)
    to_pause = [name for name in targets if states.get(name) == "running"]
    if to_pause:
        client.compose.pause(services=to_pause)


def _stop_targets(targets):
    """Stop only the targets that are running or paused ('compose stop').

    Already-stopped containers are skipped so a repeated stop is a no-op.
    """
    client = deploy._users_client(".")
    if client is None:
        return
    states = _live_states(client, targets)
    to_stop = [name for name in targets if states.get(name) in ("running", "paused")]
    if to_stop:
        client.compose.stop(services=to_stop)


def _resume_targets(targets):
    """Unpause paused targets and start stopped ones ('compose unpause'/'start').

    'unpause' only works on paused containers and 'start' only on stopped
    ones, so resume dispatches each target to the right verb by live state;
    an already-running target needs neither and is skipped.
    """
    client = deploy._users_client(".")
    if client is None:
        return
    states = _live_states(client, targets)
    paused = [name for name in targets if states.get(name) == "paused"]
    stopped = [name for name in targets if states.get(name) == "stopped"]
    if paused:
        client.compose.unpause(services=paused)
    if stopped:
        client.compose.start(services=stopped)


def _drifted(name, details, live):
    """(name, desired, actual) if *name*'s live state differs from its
    registry desired_status, else None. None if it has no live container."""
    desired = (details or {}).get("desired_status", "running")
    actual = live.get(name)
    if actual is None or actual == desired:
        return None
    return name, desired, actual


def _snapshot(output_dir="."):
    """One live-state read shared by reconcile_drift, so both drift checks
    observe the deployment at the same instant. Returns (live, registry,
    services). *live* queries only users with actual compose services (avoid
    docker rejecting unknown service names). *live* is {} when compose absent,
    None when Docker unreachable. Callers must check for None before trusting
    an empty result.
    """
    registry = load_registry(str(Path(output_dir) / REGISTRY_FILE))
    client = deploy._users_client(output_dir)
    if client is None:
        return {}, registry, {}
    services = _load_services(output_dir)
    targets = [name for name in registry if name in services]
    try:
        live = _live_states(client, targets)
    except DockerException:
        live = None
    return live, registry, services


def reconcile_drift(output_dir="."):
    """(status_drift, absent) for 'config reconcile', from a single live-state
    snapshot of *output_dir* -- see _snapshot for why this must not be two
    separate docker queries. status_drift lists (user, desired, actual) where
    a provisioned user's live state differs from its registry desired_status;
    absent lists registry users that are provisioned (have a compose service)
    but should be running and have no live container at all (e.g. an
    interrupted 'user add') -- a registry user with no compose service at all
    is find_drift's 'missing' instead, not repeated here. Both are [] when
    compose.users.yml is absent or Docker is unreachable.
    """
    live, registry, services = _snapshot(output_dir)
    if live is None:
        return [], []
    drifted = [
        entry
        for entry in (
            _drifted(name, details, live) for name, details in registry.items()
        )
        if entry is not None
    ]
    absent = [
        name
        for name, details in registry.items()
        if name in services
        and (details or {}).get("desired_status", "running") == "running"
        and live.get(name) is None
    ]
    return drifted, absent


def desired_status_drift(output_dir="."):
    """(user, desired, actual) where live state differs from desired_status.
    Returns [] when compose absent or Docker unreachable. *output_dir*
    defaults to "." for the --fix action's CWD-scoped checks.
    """
    drift, _ = reconcile_drift(output_dir)
    return drift


def missing_containers(output_dir="."):
    """Registry users desired running but with no live container.
    Returns [] when Docker unreachable. *output_dir* scopes the query so
    --output-dir never mixes deployments.
    """
    _, absent = reconcile_drift(output_dir)
    return absent


def enforce_desired_status():
    """Pause/stop/resume provisioned users so their live state matches their
    registry desired_status. Returns the (user, desired, actual) drift acted on.
    """
    drift = desired_status_drift()
    _pause_targets([name for name, desired, _ in drift if desired == "paused"])
    _stop_targets([name for name, desired, _ in drift if desired == "stopped"])
    _resume_targets([name for name, desired, _ in drift if desired == "running"])
    if drift:
        write_state(_load_services())
    return drift


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
