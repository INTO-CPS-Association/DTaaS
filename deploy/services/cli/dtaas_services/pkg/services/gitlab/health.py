"""GitLab container health checking."""

import logging
import time
from dataclasses import dataclass
from typing import Optional
from rich.console import Console
from python_on_whales import DockerClient

logger = logging.getLogger(__name__)

GITLAB_CONTAINER_NAME = "gitlab"
DEFAULT_TIMEOUT = 900
POLL_INTERVAL = 10


@dataclass
class GitLabWaitContext:
    """Context for the GitLab readiness wait loop."""

    console: Console
    docker: object
    timeout: int
    start_time: float
    last_status: Optional[str] = None


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


def _is_timeout_reached(ctx: GitLabWaitContext) -> bool:
    """Check if the wait timeout has been exceeded.

    Args:
        ctx: Wait context with start_time and timeout

    Returns:
        True if timeout reached
    """
    return (time.time() - ctx.start_time) >= ctx.timeout


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


def _get_status_label(status: str) -> str:
    """Get a short label for the current health status.

    Args:
        status: Container health status string

    Returns:
        Human-readable status label
    """
    labels = {
        "starting": "starting up",
        "unhealthy": "starting up (not healthy yet)",
        "running": "running, waiting for health check",
    }
    return labels.get(status, status)


def _get_elapsed_seconds(ctx: GitLabWaitContext) -> int:
    """Get elapsed seconds since wait started."""
    return int(time.time() - ctx.start_time)


def _build_progress_text(ctx: GitLabWaitContext) -> str:
    """Build the spinner status text with elapsed/remaining time and status."""
    elapsed = _get_elapsed_seconds(ctx)
    remaining = ctx.timeout - elapsed
    status_label = _get_status_label(ctx.last_status or "starting")
    return f"GitLab is {status_label}: {elapsed}s elapsed, {remaining}s remaining"


def _poll_gitlab_health(ctx: GitLabWaitContext, spinner) -> bool:
    """Run one iteration of the health poll loop.

    Args:
        ctx: Wait context
        spinner: Rich Status spinner to update

    Returns:
        True if GitLab is ready, False if should keep polling
    """
    container = _get_gitlab_container(ctx.docker)

    if container is None:
        ctx.console.print("[red]GitLab container not found.[/red]")
        return False

    health = _check_container_health(container)
    ctx.last_status = health

    if health == "healthy":
        return True

    spinner.update(_build_progress_text(ctx))
    time.sleep(POLL_INTERVAL)
    return False


def _run_gitlab_poll_loop(ctx: GitLabWaitContext, spinner) -> bool:
    """Run the GitLab health polling loop with spinner updates.

    Args:
        ctx: Wait context
        spinner: Rich Status spinner to update

    Returns:
        True if GitLab became ready, False on timeout
    """
    while not _is_timeout_reached(ctx):
        if _poll_gitlab_health(ctx, spinner):
            return True
    return False


def wait_for_gitlab_ready(
    console: Console,
    docker,
    timeout: int = DEFAULT_TIMEOUT,
) -> bool:
    """Wait for the GitLab container to become healthy.

    Args:
        console: Rich console for output
        docker: Docker client
        timeout: Maximum seconds to wait (default: 600)

    Returns:
        True if GitLab became ready, False on timeout
    """
    ctx = GitLabWaitContext(
        console=console,
        docker=docker,
        timeout=timeout,
        start_time=time.time(),
    )

    console.print(
        f"[cyan]Waiting for GitLab to be ready (timeout: {timeout}s)...[/cyan]"
    )

    with console.status(_build_progress_text(ctx), spinner="dots") as spinner:
        if _run_gitlab_poll_loop(ctx, spinner):
            console.print("[green]✅ GitLab is ready.[/green]")
            return True

    console.print(f"[red]GitLab did not become ready within {timeout} seconds.[/red]")
    return False


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
