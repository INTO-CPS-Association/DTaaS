"""Utility functions for DTaaS services CLI commands."""

from typing import Optional, Callable
from dataclasses import dataclass
from rich.console import Console
import click
from ..pkg.lib import Service
from ..pkg.services.thingsboard.checker import check_thingsboard_installation


@dataclass
class OperationMeta:
    """Metadata for service operations."""

    name: str
    color: str
    status_msg: str


def parse_service_list(service_names: Optional[str]) -> Optional[list[str]]:
    """Parse comma-separated service names into a list."""
    if not service_names:
        return None
    return [s.strip() for s in service_names.split(",")]


def _print_operation_status(
    console: Console, meta: OperationMeta, service_list: Optional[list[str]]
):
    """Print operation status message."""
    if service_list:
        console.print(
            f"[{meta.color}]{meta.name} "
            f"services:[/{meta.color}] {', '.join(service_list)}..."
        )
    else:
        console.print(f"[{meta.color}]{meta.name} all services....[/{meta.color}]")


def _handle_operation_result(console: Console, err, msg: str) -> None:
    """Handle the result of a service operation.

    Args:
        console: Rich console for output
        err: Error object from operation (None if success)
        msg: Result message from operation

    Raises:
        click.ClickException: If operation failed
    """
    if err is not None:
        raise click.ClickException(msg)
    console.print(f"[green]✅ {msg}[/green]")


def _handle_service_command(
    operation_func: Callable,
    service_list: Optional[list[str]],
    meta: OperationMeta,
) -> None:
    """Handle common service command logic."""
    try:
        console = Console()
        _print_operation_status(console, meta, service_list)
        with console.status(
            f"[bold {meta.color}]{meta.status_msg} [/bold {meta.color}]",
            spinner="dots",
        ):
            err, msg = operation_func(service_list)

        _handle_operation_result(console, err, msg)
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


def _get_command_metadata(command: str) -> OperationMeta:
    """Get operation metadata for a command.

    Args:
        command: Command name

    Returns:
        Operation metadata

    Raises:
        click.ClickException: If command is unknown
    """
    commands_map = {
        "start": OperationMeta("Starting", "cyan", "Starting containers..."),
        "stop": OperationMeta("Stopping", "yellow", "Stopping containers..."),
        "restart": OperationMeta("Restarting", "blue", "Restarting containers..."),
    }

    if command not in commands_map:
        raise click.ClickException(f"Unknown command: {command}")

    return commands_map[command]


def _check_thingsboard_if_starting(
    command: str, service: Service, service_list: Optional[list[str]]
) -> None:
    """Check ThingsBoard installation status if starting services.

    Args:
        command: Command being executed
        service: Service instance
        service_list: List of services to operate on
    """
    if command == "start":
        err, container_map = service.get_all_containers()
        if not err:
            check_thingsboard_installation(service.docker, container_map, service_list)


def services_command_runner(command: str, service_name) -> None:
    """Run start/stop/restart service commands."""
    service_list = parse_service_list(service_name)
    meta = _get_command_metadata(command)
    try:
        service = Service()
    except (FileNotFoundError, RuntimeError) as e:
        raise click.ClickException(str(e)) from e

    _check_thingsboard_if_starting(command, service, service_list)

    _handle_service_command(
        lambda sl: service.manage_services(command, sl), service_list, meta
    )


def build_clean_confirmation_prompt(certs: bool) -> str:
    """Build confirmation prompt for clean command."""
    prompt = "This will delete ALL data and log files for the selected services."
    if certs:
        prompt += " It will ALSO delete copied TLS cert files under certs/."
    prompt += " Continue?"
    return prompt


def check_running_services_for_clean(
    console: Console,
    running_services: list[str] | set[str],
    service_list: Optional[list[str]],
) -> None:
    """Check if any services are running and raise error if they must be stopped.

    Raises:
        click.ClickException: If services are running that need to be stopped
    """
    if service_list:
        services_to_stop = [s for s in service_list if s in running_services]
        if services_to_stop:
            console.print(
                f"[yellow]⚠️  The following services are running"
                f" and must be stopped first:[/yellow] {', '.join(services_to_stop)}"
            )
            console.print(
                f"[yellow]Run:[/yellow] dtaas-services stop -s {','.join(services_to_stop)}"
            )
            raise click.ClickException(
                "Cannot clean running services. Stop them first."
            )
    elif running_services:
        console.print(
            f"[yellow]⚠️  Some services are still \n"
            f"running:[/yellow] {', '.join(running_services)}"
        )
        console.print("[yellow]Run:[/yellow] dtaas-services stop")
        raise click.ClickException(
            "Cannot clean while services are running. Stop all services first."
        )


def print_clean_status(console: Console, service_list: Optional[list[str]]) -> None:
    """Print status message for clean operation."""
    if service_list:
        console.print(
            f"[yellow]Cleaning services:[/yellow] {', '.join(service_list)}..."
        )
    else:
        console.print("[yellow]Cleaning all services...[/yellow]")


def build_clean_status_message(certs: bool) -> str:
    """Build status message for clean operation."""
    if certs:
        return "[bold yellow]Removing data, log, and cert files...[/bold yellow]"
    return "[bold yellow]Removing data and log files...[/bold yellow]"
