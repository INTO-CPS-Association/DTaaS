"""GitLab container health checking."""

import logging
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException
from ...utils import get_container_health_status, has_running_container

logger = logging.getLogger(__name__)

GITLAB_CONTAINER_NAME = "gitlab"


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


def is_gitlab_healthy(docker) -> str:
    """Check the current health status of the GitLab container (non-blocking).

    Args:
        docker: Docker client

    Returns:
        Health status string: "healthy", "starting", "unhealthy",
        "not found", or "unknown"
    """
    container = _get_gitlab_container(docker)
    if container is None:
        return "not found"
    return get_container_health_status(container)


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
