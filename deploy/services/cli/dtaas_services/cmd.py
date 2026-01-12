"""DTaaS Services CLI commands"""

from pathlib import Path

from typing import Optional, Callable
from dataclasses import dataclass
import time
import click
from rich.console import Console

import dtaas_services
from .pkg.cert import copy_certs
from .pkg.mongodb import permissions_mongodb
from .pkg.influxdb import permissions_influxdb
from .pkg.rabbitmq import permissions_rabbitmq
from .pkg.thingsboard import permissions_thingsboard
from .pkg.service import Service
from .pkg.utils import check_root_unix
from .pkg.template import generate_project_structure
from .pkg.formatter import format_container_status
from .pkg import influxdb, rabbitmq, thingsboard


@dataclass
class OperationMeta:
    """Metadata for service operations."""

    name: str
    color: str
    status_msg: str


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


def _parse_service_list(service_names: Optional[str]) -> Optional[list[str]]:
    """Parse comma-separated service names into a list."""
    if not service_names:
        return None
    return [s.strip() for s in service_names.split(",")]


def _handle_service_command(
    operation_func: Callable,
    service_list: Optional[list[str]],
    meta: OperationMeta,
) -> None:
    """Handle common service command logic."""
    try:
        Service()
        console = Console()
        _print_operation_status(console, meta, service_list)
        with console.status(
            f"[bold {meta.color}]{meta.status_msg} [/bold {meta.color}]",
            spinner="dots",
        ):
            err, msg = operation_func(service_list)

        if err is not None:
            raise click.ClickException(msg)

        console.print(f"[green]✅ {msg}[/green]")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


@click.group()
def services():
    """Manage DTaaS platform services."""


@services.command()
@click.option("--path", default=".", help="Directory to generate project structure")
def generate_project(path):
    """
    Generate project structure with template config, data directories, and compose file.
    This creates the necessary directory structure and copies template files
    from the installed package so you can run dtaas-services commands.
    Example:
        dtaas-services generate-project
        dtaas-services generate-project --path /path/to/project
    """
    target_dir = Path(path).resolve()
    package_root = Path(dtaas_services.__file__).parent

    success, message = generate_project_structure(target_dir, package_root)

    if not success:
        raise click.ClickException(message)

    click.echo(message)


def _run_setup_step(console: Console, step_name: str, step_func: Callable):
    """Helper to run a setup step with console output."""
    console.print(f"\n[cyan]{step_name}...[/cyan]")
    success, msg = step_func()
    if not success:
        raise click.ClickException(f"{step_name} failed: {msg}")
    console.print(f"[green]✅ {step_name} completed:[/green] {msg}")


@services.command()
def setup():
    """
    Set up TLS certificates and permissions for services.
    This command runs all these steps:
    - Copies TLS certificates to the correct locations
    - Sets up MongoDB certificates and permissions
    - Sets up InfluxDB certificates and permissions
    - Sets up RabbitMQ certificates and permissions
    - Sets up ThingsBoard certificates and permissions

    """
    try:
        check_root_unix()
        console = Console()
        console.print("[bold cyan]Starting service setup....[/bold cyan]")
        steps = [
            ("Copying certificates", copy_certs),
            ("Configuring MongoDB", permissions_mongodb),
            ("Configuring InfluxDB", permissions_influxdb),
            ("Configuring RabbitMQ", permissions_rabbitmq),
            ("Configuring ThingsBoard", permissions_thingsboard),
        ]

        for step_name, step_func in steps:
            _run_setup_step(console, step_name, step_func)

        console.print("\n[green]✅ Setup completed successfully![/green]")
        console.print("[cyan]Next steps:[/cyan]")
        console.print("  1. Start services: dtaas-services start")
        console.print("  2. Install ThingsBoard (if using it):")
        console.print("     - Start PostgreSQL: dtaas-services start -s postgresql")
        console.print("     - Install ThingsBoard: dtaas-services install-thingsboard")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


@services.command()
def install_thingsboard():
    """
    Install ThingsBoard database schema.

    Prerequisites:
    - dtaas-services setup must be completed
    - PostgreSQL must be running (start with: dtaas-services start -s postgresql)

    This command initializes the ThingsBoard database and creates the default
    system administrator account. It must be run only once after initial setup.
    """
    try:
        check_root_unix()
        console = Console()

        try:
            service = Service()
            docker = service.docker
            try:
                # Try to get containers to verify PostgreSQL is accessible
                containers = docker.compose.ps()
                postgres_running = any(
                    c.name == "postgres"
                    for c in containers
                    if hasattr(c, "state") and c.state.status == "running"
                )
                if not postgres_running:
                    console.print(
                        "[yellow]⚠️  PostgreSQL does not appear to be running[/yellow]"
                    )
                    console.print(
                        "[cyan]Start it with: dtaas-services start -s postgresql[/cyan]"
                    )
            except Exception:
                # If we can't check, proceed anyway
                pass

            console.print(
                "[cyan]Running ThingsBoard installation "
                "(this may take a few minutes)...[/cyan]"
            )
            with console.status(
                "[bold cyan]Installing ThingsBoard schema...[/bold cyan]",
                spinner="dots",
            ):
                docker.compose.run(
                    "thingsboard-ce",
                    remove=True,
                    envs={"INSTALL_TB": "true", "LOAD_DEMO": "false"},
                    service_ports=False,
                    use_aliases=True,
                )
            console.print("[green]✅ ThingsBoard installation completed[/green]")
            console.print("\n[cyan]Next steps:[/cyan]")
            console.print("  1. Start ThingsBoard: dtaas-services start -s thingsboard")
            console.print("  2. Add users (if using credentials.csv):")
            console.print("     dtaas-services user add")
        except Exception as e:
            raise click.ClickException(
                f"ThingsBoard installation failed: {str(e)}"
            ) from e
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


def _services_command_runner(command: str, service_name) -> None:
    """Run start/stop/restart service commands."""
    service_list = _parse_service_list(service_name)
    commands_map = {
        "start": OperationMeta("Starting", "cyan", "Starting containers..."),
        "stop": OperationMeta("Stopping", "yellow", "Stopping containers..."),
        "restart": OperationMeta("Restarting", "blue", "Restarting containers..."),
    }

    if command in commands_map:
        meta = commands_map[command]
        service = Service()
        # Lambda receives service_list from _handle_service_command
        _handle_service_command(
            lambda sl: service.manage_services(command, sl), service_list, meta
        )
    else:
        raise click.ClickException(f"Unknown command: {command}")


@services.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to start",
)
def start(service_names):
    """Start the platform services."""
    _services_command_runner("start", service_names)


@services.command()
@click.option(
    "--services", "-s", "service_names", help="Comma-separated list of services to stop"
)
def stop(service_names):
    """Stop the platform services."""
    _services_command_runner("stop", service_names)


@services.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to restart",
)
def restart(service_names):
    """Restart the platform services."""
    _services_command_runner("restart", service_names)


@services.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to check",
)
def status(service_names):
    """Show the status of the platform services."""
    try:
        setup_obj = Service()
        console = Console()

        service_list = _parse_service_list(service_names)

        err, containers = setup_obj.get_status(service_list)
        if err is not None:
            error_msg = f"Failed to get status: {str(err)}"
            raise click.ClickException(error_msg)

        # Use rich formatter to display status
        format_container_status(containers, console)

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


def _print_remove_status(console: Console, service_list: Optional[list[str]]):
    """Print remove operation status message."""
    if service_list:
        console.print(f"[red]Removing services:[/red] {', '.join(service_list)}...")
    else:
        console.print("[red]Removing all services...[/red]")


@services.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to remove",
)
@click.option("--volumes", "-v", is_flag=True, help="Remove volumes as well")
def remove(service_names, volumes):
    """Remove the platform services and optionally their volumes."""
    try:
        setup_obj = Service()
        console = Console()
        service_list = _parse_service_list(service_names)
        _print_remove_status(console, service_list)
        with console.status(
            "[bold red]Removing containers...[/bold red]", spinner="dots"
        ):
            err, msg = setup_obj.remove_services(service_list, remove_volumes=volumes)
        if err is not None:
            raise click.ClickException(msg)
        console.print(f"[green]✅ {msg}[/green]")

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


@services.group()
def user():
    """User account management for services."""


@user.command()
def add():
    """
    Add user accounts to InfluxDB, RabbitMQ, and ThingsBoard.
    Reads config/credentials.csv and creates accounts in all services.
    Example:
        dtaas-services user add
    """
    console = Console()
    console.print("[bold cyan]Adding users from CSV file...[/bold cyan]")
    console.print("\n[cyan]Adding users to InfluxDB...[/cyan]")
    success, msg = influxdb.setup_influxdb_users()
    if not success:
        error_line = msg.split("\n")[0]
        console.print(f"[red]InfluxDB: {error_line}[/red]", style="bold")
    else:
        console.print(f"[green]✅ InfluxDB: {msg}[/green]")

    console.print("\n[cyan]Adding users to RabbitMQ...[/cyan]")
    success, msg = rabbitmq.setup_rabbitmq_users()
    if not success:
        error_line = msg.split("\n")[0]
        console.print(f"[red]RabbitMQ: {error_line}[/red]", style="bold")
    else:
        console.print(f"[green]✅ RabbitMQ: {msg}[/green]")

    console.print("\n[cyan]Adding users to ThingsBoard...[/cyan]")
    success, msg = thingsboard.setup_thingsboard_users()
    if not success:
        error_line = msg.split("\n")[0]
        console.print(f"[red]ThingsBoard: {error_line}[/red]", style="bold")
    else:
        console.print(f"[green]✅ ThingsBoard: {msg}[/green]")

    console.print("\n[bold green]✅ Adding user completed![/bold green]")


if __name__ == "__main__":
    services()
