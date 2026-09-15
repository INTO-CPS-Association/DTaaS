"""Helpers for the service install command (ThingsBoard and GitLab flows)."""

from typing import Optional
import click
from rich.console import Console
from ..pkg.lib import Service
from ..pkg.services.postgres.postgres import wait_for_postgres_ready
from ..pkg.services.thingsboard.tb_utility import run_thingsboard_install
from ..pkg.services.thingsboard.sysadmin_util import update_sysadmin_email_in_db
from ..pkg.services.gitlab import setup_gitlab

# Accepted selector names mapped to the install flow they run.
INSTALL_FLOWS = {
    "thingsboard": "thingsboard",
    "thingsboard-ce": "thingsboard",
    "gitlab": "gitlab",
}

DEFAULT_INSTALL_TARGETS = ["thingsboard", "gitlab"]


def resolve_install_targets(service_list: Optional[list[str]]) -> list[str]:
    """Validate selected services and return the install flows to run, in order.

    Raises:
        click.ClickException: If any service is not supported
    """
    if not service_list:
        return list(DEFAULT_INSTALL_TARGETS)
    unsupported = [s for s in service_list if s.lower() not in INSTALL_FLOWS]
    if unsupported:
        raise click.ClickException(
            "Installation is supported for ThingsBoard and GitLab. "
            f"Got: {', '.join(unsupported)}"
        )
    return list(dict.fromkeys(INSTALL_FLOWS[s.lower()] for s in service_list))


def _ensure_service_running(
    console: Console, service_obj: Service, service_name: str
) -> object:
    """Start a service if needed and return docker client.

    Args:
        console: Rich console for output
        service_obj: Service object to manage services
        service_name: Name of the service to start (e.g. 'postgres', 'gitlab')
    Returns:
        docker_client
    """

    console.print(f"[cyan]Ensuring {service_name} is running...[/cyan]")
    err, msg = service_obj.manage_services("start", [service_name])
    if err is not None:
        raise click.ClickException(f"Failed to start {service_name}: {msg}")
    console.print(f"[green]{msg}[/green]")
    return service_obj.docker


def _install_thingsboard(console: Console, service_obj: Service) -> None:
    """Run ThingsBoard installation flow."""
    docker = _ensure_service_running(console, service_obj, "postgres")
    wait_for_postgres_ready(console, docker)
    run_thingsboard_install(console, docker)
    update_sysadmin_email_in_db(console, docker)
    console.print("[green]✅ ThingsBoard installation completed![/green]")


GITLAB_NOT_READY_STATUSES = {"starting", "unhealthy", "not found", "unknown state"}

GITLAB_NOT_READY_HINT = (
    "[yellow]GitLab is not ready yet. "
    "It typically takes 5–10 minutes after first start.[/yellow]\n"
    "[cyan]Next steps:[/cyan]\n"
    "  1. Check health:  dtaas-services service status -s gitlab\n"
    "     It will be 'starting' or 'not-ready' while it's initializing.\n"
    "  2. When GitLab health shows 'running', re-run:\n"
    "     dtaas-services service install -s gitlab"
)


def _install_gitlab(console: Console, service_obj: Service) -> None:
    """Run GitLab post-install setup flow."""
    docker = _ensure_service_running(console, service_obj, "gitlab")
    success, msg = setup_gitlab(console, docker)
    if success:
        console.print(f"[green]✅ {msg}[/green]")
        return
    if msg in GITLAB_NOT_READY_STATUSES:
        console.print(GITLAB_NOT_READY_HINT)
        return
    raise click.ClickException(f"GitLab installation failed: {msg}")


def install_services(
    console: Console, service_obj: Service, targets: list[str]
) -> None:
    """Run the install flow of each target in order."""
    installers = {"thingsboard": _install_thingsboard, "gitlab": _install_gitlab}
    for target in targets:
        installers[target](console, service_obj)
