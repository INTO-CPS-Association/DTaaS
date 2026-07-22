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

Partial-failure note: stop/start/pause/unpause act on the deployment project
first, then the user-added project (compose.users.yml) when it exists. If the
first project's compose command fails, the second is never attempted; if the
first succeeds and the second then fails, the first project has already been
mutated -- there is no rollback. Each project's own compose command is
idempotent, so re-running the same lifecycle command is the recovery path:
it repeats a harmless no-op against whichever project already changed and
retries the one that failed.
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


def _clients(directory):
    """The deployment client plus the user-workloads client when present."""
    clients = [deploy._client(directory)]
    users = deploy._users_client(directory)
    if users is not None:
        clients.append(users)
    return clients


def stop(directory="."):
    """Stop every container in place without removing it ('compose stop').

    Reverse with 'dtaas admin start'. Raises OSError when the deployment is
    missing, or DockerException if compose itself fails.
    """
    deploy.require_compose_file(directory)
    for client in _clients(directory):
        client.compose.stop()


def start(directory="."):
    """Start every stopped container in place ('compose start').

    The counterpart to 'dtaas admin stop'. Raises OSError when the deployment
    is missing, or DockerException if compose itself fails.
    """
    deploy.require_compose_file(directory)
    for client in _clients(directory):
        client.compose.start()


def pause(directory="."):
    """Freeze every running container in place ('compose pause').

    Reverse with 'dtaas admin resume'. Raises OSError when the deployment is
    missing, or DockerException if compose itself fails.
    """
    deploy.require_compose_file(directory)
    for client in _clients(directory):
        client.compose.pause()


def unpause(directory="."):
    """Resume every paused container ('compose unpause').

    Raises OSError when the deployment is missing, or DockerException if
    compose itself fails.
    """
    deploy.require_compose_file(directory)
    for client in _clients(directory):
        client.compose.unpause()
