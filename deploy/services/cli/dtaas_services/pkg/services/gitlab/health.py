"""GitLab container health checking."""

import json
import logging
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException
from ...docker_utils import execute_docker_command, DockerRunOptions
from ...utils import get_container_health_status, has_running_container

logger = logging.getLogger(__name__)

GITLAB_CONTAINER_NAME = "gitlab"
# Served only to localhost, so it is called from inside the container
GITLAB_READINESS_URL = "https://localhost/gitlab/-/readiness"
# Seconds; service status waits for this call, so it must not hang
READINESS_TIMEOUT = "10"


def _get_gitlab_container(docker):
    """Find the GitLab container among running Docker containers.

    Args:
        docker: Docker client

    Returns:
        Container object or None if not found
    """
    try:
        containers = docker.compose.ps()
        return next((c for c in containers if c.name == GITLAB_CONTAINER_NAME), None)
    except (DockerException, OSError):
        logger.exception("Error while listing Docker containers")
        return None


def is_gitlab_ready() -> bool:
    """Check GitLab's own readiness endpoint from inside the container.

    Returns:
        True when the endpoint answers with status "ok"
    """
    success, output = execute_docker_command(
        GITLAB_CONTAINER_NAME,
        ["curl", "-sk", "--max-time", READINESS_TIMEOUT, GITLAB_READINESS_URL],
        DockerRunOptions(verbose=False),
    )
    try:
        return success and json.loads(output).get("status") == "ok"
    except (ValueError, AttributeError):
        return False


def _apply_readiness(health: str) -> str:
    """Return GitLab's status from Docker's health status.

    Docker reports the container healthy before nginx and Puma serve
    requests on first boot, and still healthy when Gitaly or the database
    fail, so a healthy container that fails is_gitlab_ready is "unhealthy".
    """
    if health == "healthy" and not is_gitlab_ready():
        return "unhealthy"
    return health


def is_gitlab_healthy(docker) -> str:
    """Check the current health status of the GitLab container (non-blocking).

    Args:
        docker: Docker client

    Returns:
        Health status string: "healthy", "starting", "unhealthy",
        "not found", or "unknown state"
    """
    container = _get_gitlab_container(docker)
    if container is None:
        return "not found"
    return _apply_readiness(get_container_health_status(container))


def _is_running_and_healthy(container) -> bool:
    """Check that Docker reports the container running and healthy."""
    state = getattr(getattr(container, "state", None), "status", None)
    return state == "running" and get_container_health_status(container) == "healthy"


def status_overrides(containers: list) -> dict[str, str]:
    """Return the statuses `service status` shows instead of Docker's.

    Only a running GitLab that Docker calls healthy is checked, with the
    rule is_gitlab_healthy uses.

    Returns:
        Mapping of container name to status; empty when Docker's applies
    """
    gitlab = next((c for c in containers if c.name == GITLAB_CONTAINER_NAME), None)
    if gitlab is None or not _is_running_and_healthy(gitlab):
        return {}
    status = _apply_readiness("healthy")
    return {} if status == "healthy" else {gitlab.name: status}


def is_gitlab_running() -> bool:
    """Check if the GitLab container exists and is running.

    Creates its own Docker client so it can be called from anywhere
    without needing an existing DockerClient instance.

    Returns:
        True if the container is found and running, False otherwise
    """
    try:
        docker = DockerClient()
        containers = docker.container.list(filters={"name": GITLAB_CONTAINER_NAME})
        return has_running_container(containers)
    except (DockerException, OSError):
        logger.exception("Error while checking if GitLab is running")
        return False
