"""GitLab container health checking."""

import logging
from typing import Optional
from python_on_whales import DockerClient

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
    except Exception:
        logger.exception("Error while listing Docker containers")
        return None


def _check_container_health(container) -> str:
    """Get the health status of the GitLab container.

    Args:
        container: Docker container object

    Returns:
        Health status string, or "unknown" if not available
    """
    try:
        if hasattr(container.state, "health") and container.state.health:
            return container.state.health.status
    except (AttributeError, TypeError):
        logger.warning("Could not get health status for gitlab.")
    return "unknown state"


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
    return _check_container_health(container)


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
        return any(
            hasattr(c, "state") and c.state.status == "running" for c in containers
        )
    except Exception:
        logger.exception("Error while checking if GitLab is running")
        return False
