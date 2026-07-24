"""Lifecycle operations for a generated deployment: status, stop, start, pause.

These sit beside install/uninstall in deploy.py but form the operational
control surface used to observe and suspend a running deployment *without*
removing it (which is what uninstall does):

- collect_status: per-service state for the main deployment and any
  user-added workloads (compose.users.yml). Docker's 'exited' is reported as
  'stopped' to match the 'stop' verb.
- stop / start: terminate every container in place ('docker compose stop')
  and bring the stopped containers back ('docker compose start').
- pause / unpause: freeze and thaw running containers ('docker compose
  pause' / 'unpause').

The docker-client plumbing (require_compose_file, the compose clients, and
compose_services) is reused from deploy.py so both command families share one
definition of "the deployment".

Scope: collect_status reports both the core services and the user-added project
(compose.users.yml), giving a whole-installation view. The suspend verbs
(stop/start/pause/unpause) act on the core services only -- per-user containers
are suspended individually via 'dtaas user stop'/'pause'/'resume'
(users_lifecycle.py), keeping the platform and user axes orthogonal.
"""

from . import deploy

COMPOSE_SERVICE_LABEL = "com.docker.compose.service"
DEPLOYMENT_PROJECT = "deployment"
USERS_PROJECT = "users"
_STATE_ALIASES = {"exited": "stopped"}


def _service_name(container):
    """The compose service name for *container*, falling back to its name."""
    labels = container.config.labels
    if labels:
        return labels.get(COMPOSE_SERVICE_LABEL, container.name)
    return container.name


def _state_name(container):
    """A single clear state word for *container* (paused/running/stopped/...)."""
    state = container.state
    if state.paused:
        return "paused"
    status = state.status or "unknown"
    return _STATE_ALIASES.get(status, status)


def _health_name(container):
    """The container's healthcheck status, or None when it has no healthcheck."""
    health = container.state.health
    if health is None:
        return None
    return health.status


def _row(project, container):
    """Build one machine-readable status record for *container*."""
    return {
        "project": project,
        "service": _service_name(container),
        "state": _state_name(container),
        "health": _health_name(container),
    }


def _client_rows(project, client):
    """Status records for every container (any state) known to *client*."""
    return [_row(project, container) for container in client.compose.ps(all=True)]


def _absent_rows(defined, present):
    """Records for deployment services that are defined but not created."""
    return [
        {
            "project": DEPLOYMENT_PROJECT,
            "service": name,
            "state": "not created",
            "health": None,
        }
        for name in sorted(defined - present)
    ]


def _user_rows(directory):
    """Status records for user-added workloads, or [] when none exist."""
    client = deploy._users_client(directory)
    if client is None:
        return []
    return _client_rows(USERS_PROJECT, client)


def collect_status(directory="."):
    """Per-service status for the deployment and any user-added workloads.

    Every service defined in docker-compose.yml is reported: running ones from
    their live container, and defined-but-uncreated ones as 'not created'.
    Raises OSError when the deployment has not been generated, or
    DockerException if the docker CLI itself fails.
    """
    deploy.require_compose_file(directory)
    rows = _client_rows(DEPLOYMENT_PROJECT, deploy._client(directory))
    present = {row["service"] for row in rows}
    rows += _absent_rows(deploy.compose_services(directory), present)
    return rows + _user_rows(directory)


def running_user_container_count(directory="."):
    """Number of per-user containers currently in the 'running' state.

    Lets 'platform stop'/'pause' tell the operator how many per-user containers
    were deliberately left running (the core-only suspend does not touch them).
    Uses ps(all=True) plus a state check (like _row) rather than the bare
    non-stopped ps(), which would also count already-paused containers as
    "still running".
    """
    client = deploy._users_client(directory)
    if client is None:
        return 0
    containers = client.compose.ps(all=True)
    return sum(1 for container in containers if _state_name(container) == "running")


def stop(directory="."):
    """Stop the core services in place without removing them ('compose stop').

    Acts on the core services only (not per-user containers). Reverse with
    'dtaas platform start'. Raises OSError when the deployment is missing, or
    DockerException if compose itself fails.
    """
    deploy.require_compose_file(directory)
    deploy._client(directory).compose.stop()


def start(directory="."):
    """Start the stopped core services in place ('compose start').

    Acts on the core services only. The counterpart to 'dtaas platform stop'.
    Raises OSError when the deployment is missing, or DockerException if
    compose itself fails.
    """
    deploy.require_compose_file(directory)
    deploy._client(directory).compose.start()


def pause(directory="."):
    """Freeze the running core services in place ('compose pause').

    Acts on the core services only (not per-user containers). Reverse with
    'dtaas platform resume'. Raises OSError when the deployment is missing, or
    DockerException if compose itself fails.
    """
    deploy.require_compose_file(directory)
    deploy._client(directory).compose.pause()


def unpause(directory="."):
    """Resume the paused core services ('compose unpause').

    Acts on the core services only. Raises OSError when the deployment is
    missing, or DockerException if compose itself fails.
    """
    deploy.require_compose_file(directory)
    deploy._client(directory).compose.unpause()
