"""This module provides functions to check if PostgreSQL can be safely stopped or removed."""

from typing import Optional, Tuple
import logging
import sys
import click
from rich.console import Console
from ...utils import is_ci

logger = logging.getLogger(__name__)


def _query_thingsboard_schema(docker) -> bool:
    """Query PostgreSQL for ThingsBoard schema existence."""
    try:
        result = docker.execute(
            "postgres",
            [
                "sh",
                "-c",
                'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc '
                + '"SELECT EXISTS (SELECT 1 FROM '
                + "information_schema.tables WHERE table_name = 'admin_settings');\"",
            ],
        )
        return result.strip() == "t"
    except Exception:
        return False


def _validate_postgres_for_thingsboard_check(container_map: dict) -> bool:
    """Validate PostgreSQL container is available and running for TB check."""
    if "postgres" not in container_map:
        return False

    postgres_container = container_map["postgres"]
    return (
        hasattr(postgres_container, "state")
        and postgres_container.state.status == "running"
    )


def _find_thingsboard_containers(docker) -> list:
    """Get list of ThingsBoard containers.

    Args:
        docker: Docker client instance

    Returns:
        List of ThingsBoard containers (empty if error)
    """
    try:
        return docker.container.list(filters={"name": "thingsboard"})
    except Exception as e:
        logger.warning(f"Failed to list ThingsBoard containers: {e}")
        return []


def _is_container_running(container) -> bool:
    """Check if a single container is running.

    Args:
        container: Container object

    Returns:
        True if container has state and is running
    """
    return hasattr(container, "state") and container.state.status == "running"


def _has_running_container(containers: list) -> bool:
    """Check if any container in list is running.

    Args:
        containers: List of container objects

    Returns:
        True if any container is running
    """
    return any(_is_container_running(container) for container in containers)


def _is_thingsboard_container_running(docker) -> bool:
    """Check if ThingsBoard container is running.

    This checks if the thingsboard container exists and running.
    This is used for dependency checking. PostgreSQL must not be stopped or removed
    while ThingsBoard is running since ThingsBoard depends on PostgreSQL.
    """
    containers = _find_thingsboard_containers(docker)
    return _has_running_container(containers)


def is_thingsboard_installed(docker, container_map: dict) -> bool:
    """Check if ThingsBoard database schema is installed in PostgreSQL.

    This is used to determine if the user needs to run the install command
    when starting services. The schema persists even if the container is removed.

    Args:
        docker: Docker client instance
        container_map: Dict mapping container names to container objects

    Returns:
        bool: True if ThingsBoard schema is installed
    """
    try:
        if not _validate_postgres_for_thingsboard_check(container_map):
            return False
        return _query_thingsboard_schema(docker)
    except Exception:
        return False


def _should_check_thingsboard(service_list: Optional[list[str]]) -> bool:
    """Check if ThingsBoard installation check is needed."""
    return (
        service_list is None
        or "thingsboard-ce" in service_list
        or "thingsboard" in service_list
    )


def _prompt_thingsboard_installation() -> None:
    """Display ThingsBoard installation warning and prompt."""
    console = Console()
    console.print("[yellow]⚠️  ThingsBoard is not installed yet.[/yellow]")
    console.print("[cyan]You need to run 'dtaas-services install' [/cyan]")


def _confirm_continue_without_thingsboard() -> None:
    """Confirm user wants to continue without ThingsBoard installation.

    Raises:
        click.ClickException: If user cancels the operation
    """
    if (
        sys.stdin.isatty()
        and not is_ci()
        and not click.confirm(
            "Do you want to continue starting services?", default=True
        )
    ):
        raise click.ClickException("Operation cancelled by user")


def check_thingsboard_installation(
    docker, container_map: dict, service_list: Optional[list[str]]
) -> None:
    """Check if ThingsBoard needs installation and prompt user.

    Args:
        docker: Docker client instance
        container_map: Dict mapping container names to container objects
        service_list: Optional list of services being started

    Raises:
        click.ClickException: If user cancels the operation
    """
    if not _should_check_thingsboard(service_list):
        return

    if is_thingsboard_installed(docker, container_map):
        return

    _prompt_thingsboard_installation()
    _confirm_continue_without_thingsboard()
    Console().print("[cyan]Remember to run: dtaas-services install[/cyan]")


def check_postgres_dependency(
    self, service_list: Optional[list]
) -> Tuple[Optional[Exception], Optional[str]]:
    """
    Check if postgres can be removed when thingsboard is running.
    Returns (Exception, message) if postgres can't be removed, (None, None) otherwise.
    """
    # Service names can be either 'thingsboard' or 'thingsboard-ce' depending on configuration
    should_check = (
        service_list
        and "postgres" in service_list
        and "thingsboard" not in service_list
        and "thingsboard-ce" not in service_list
    )

    if not should_check:
        return None, None

    if _is_thingsboard_container_running(self.docker):
        err = ValueError(
            "Cannot remove PostgreSQL while ThingsBoard is running. "
            "Stop or remove ThingsBoard first with: dtaas-services stop -s thingsboard"
        )
        return err, str(err)

    return None, None
