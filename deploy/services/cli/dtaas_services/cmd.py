"""DTaaS Services CLI commands"""

from pathlib import Path
import os
from typing import Optional, Callable
from dataclasses import dataclass
import click
import sys
import time
from rich.console import Console
import dtaas_services
from .pkg.cert import copy_certs
from .pkg.mongodb import permissions_mongodb
from .pkg.influxdb import permissions_influxdb
from .pkg.rabbitmq import permissions_rabbitmq
from .pkg.service import Service
from .pkg.utils import check_root_unix, is_ci
from .pkg.template import generate_project_structure
from .pkg.formatter import format_container_status
from .pkg import influxdb, rabbitmq, thingsboard
from .pkg.thingsboard_permissions import permissions_thingsboard


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
@click.option(
    "--path",
    default=None,
    help="Directory to generate project structure (defaults to current directory)",
)
def generate_project(path):
    """
    Generate project structure with template config, data directories, and compose file.
    This creates the necessary directory structure and copies template files
    from the installed package so you can run dtaas-services commands.
    Example:
        dtaas-services generate-project
        dtaas-services generate-project --path /path/to/project
    """
    if path is None:
        target_dir = Path.cwd()
    else:
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


def _wait_for_postgres_ready(console: Console, docker, timeout: int = 15) -> None:
    """
    Wait for PostgreSQL to be ready to accept connections.

    Args:
        console: Rich console for output
        docker: Docker client
        timeout: Maximum time to wait in seconds

    Raises:
        click.ClickException: If PostgreSQL doesn't become ready within timeout
    """

    console.print("[cyan]Waiting for PostgreSQL to be ready...[/cyan]")
    start_time = time.time()
    last_status = None

    while time.time() - start_time < timeout:
        try:
            # Check if postgres container is running and healthy
            containers = docker.compose.ps()
            postgres = next((c for c in containers if c.name == "postgres"), None)

            if postgres and hasattr(postgres, "state"):
                current_status = postgres.state.status

                if current_status != last_status:
                    if current_status == "running":
                        console.print(
                            "[green]PostgreSQL container is running, checking health...[/green]"
                        )
                    elif current_status == "restarting":
                        console.print(
                            "[yellow]⚠️  PostgreSQL is restarting. "
                            "Check logs with: docker logs postgres[/yellow]"
                        )
                    last_status = current_status

                # Check if container is running
                if current_status == "running":
                    # Check health status if available
                    if hasattr(postgres.state, "health") and postgres.state.health:
                        if postgres.state.health == "healthy":
                            console.print("[green]✅ PostgreSQL is ready[/green]")
                            return

                    # Fallback: Try pg_isready command using docker.execute
                    try:
                        pg_user = os.environ.get("POSTGRES_USER", "postgres")
                        result = docker.execute(
                            "postgres", ["pg_isready", "-U", pg_user]
                        )
                        if isinstance(result, str):
                            if "accepting" in result.lower():
                                console.print("[green]✅ PostgreSQL is ready[/green]")
                                return
                        # In some contexts the execute call may return (out, exit_code)
                        if isinstance(result, (list, tuple)) and len(result) > 1:
                            try:
                                if int(result[1]) == 0:
                                    console.print(
                                        "[green]✅ PostgreSQL is ready[/green]"
                                    )
                                    return
                            except Exception:
                                pass
                    except Exception:
                        pass
                elif current_status == "restarting":
                    time.sleep(3)
                    continue
        except Exception as e:
            # Log error but continue waiting
            console.print(f"[yellow]Warning: {str(e)}[/yellow]")

        time.sleep(2)

    raise click.ClickException(
        f"PostgreSQL did not become ready within {timeout} seconds. "
        "This usually indicates a configuration problem. "
    )


def _run_thingsboard_install(console: Console, docker) -> None:
    """Run ThingsBoard database installation."""
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


@services.command()
@click.option(
    "-s",
    "--service",
    default="thingsboard",
    help="Service to install (only 'thingsboard' is supported)",
)
def install(service):
    """
    Install service database schema.

    Prerequisites:
    - dtaas-services setup must be completed

    This command automatically starts PostgreSQL if needed, then initializes
    the ThingsBoard database and creates the default system administrator account.
    It must be run only once after initial setup.
    """
    try:
        check_root_unix()
        console = Console()

        if service and service.lower() not in ["thingsboard", "thingsboard-ce"]:
            raise click.ClickException(
                f"Installation is only supported for ThingsBoard. Got: {service}"
            )

        service_obj = Service()
        docker = service_obj.docker

        # Start PostgreSQL (will be skipped if already running/restarting)
        console.print("[cyan]Ensuring PostgreSQL is running...[/cyan]")
        err, msg = service_obj.manage_services("start", ["postgres"])
        if err is not None:
            raise click.ClickException(f"Failed to start PostgreSQL: {msg}")
        console.print(f"[green]{msg}[/green]")

        _wait_for_postgres_ready(console, docker)
        _run_thingsboard_install(console, docker)
        console.print("[green]✅ ThingsBoard installation completed![/green]")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except Exception as e:
        raise click.ClickException(f"ThingsBoard installation failed: {str(e)}") from e


def _check_thingsboard_installation(
    service: Service, service_list: Optional[list[str]]
) -> None:
    """Check if ThingsBoard needs installation and prompt user.

    Args:
        service: Service instance to check ThingsBoard installation status
        service_list: Optional list of services being started

    Raises:
        click.ClickException: If user cancels the operation
    """

    if service_list is None or "thingsboard-ce" in service_list:
        # User wants to start thingsboard
        if not service._is_thingsboard_installed():
            console = Console()
            console.print("[yellow]⚠️  ThingsBoard is not installed yet.[/yellow]")
            console.print(
                "[cyan]You need to run 'dtaas-services install' "
                "after starting PostgreSQL.[/cyan]"
            )
            # Check if running in interactive mode
            if sys.stdin.isatty() and not is_ci():
                if not click.confirm(
                    "Do you want to continue starting services?", default=True
                ):
                    raise click.ClickException("Operation cancelled by user")
            # Non-interactive, CI environment, or user confirmed: continue
            console.print("[cyan]Remember to run: dtaas-services install[/cyan]")


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

        # Check if ThingsBoard needs installation (only for start command)
        if command == "start":
            _check_thingsboard_installation(service, service_list)

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


@services.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to clean",
)
@click.option(
    "--certs",
    is_flag=True,
    default=False,
    help=(
        "Also delete copied TLS cert files under certs/<HOSTNAME>. "
        "This will require re-running dtaas-services setup."
    ),
)
def clean(service_names, certs):
    """
    Clean all temporary files and data for services.

    This removes all files from data and log directories for the specified services,
    including .gitkeep files. Useful for preparing to reinstall services.

    By default, certificates under certs/<HOSTNAME> are preserved. Use --certs to delete them.

    Services must be stopped before cleaning.
    """
    try:
        setup_obj = Service()
        console = Console()
        service_list = _parse_service_list(service_names)

        prompt = "This will delete ALL data and log files for the selected services."
        if certs:
            prompt += (
                " It will ALSO delete copied TLS cert files under certs/<HOSTNAME>."
            )
        prompt += " Continue?"
        click.confirm(prompt, default=False, abort=True)

        # Check if any services are running
        running_services = setup_obj._get_running_services()
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
                f"[yellow]⚠️  Some services are still running:[/yellow] {', '.join(running_services)}"
            )
            console.print("[yellow]Run:[/yellow] dtaas-services stop")
            raise click.ClickException(
                "Cannot clean while services are running. Stop all services first."
            )

        if service_list:
            console.print(
                f"[yellow]Cleaning services:[/yellow] {', '.join(service_list)}..."
            )
        else:
            console.print("[yellow]Cleaning all services...[/yellow]")

        status_msg = "[bold yellow]Removing data and log files...[/bold yellow]"
        if certs:
            status_msg = (
                "[bold yellow]Removing data, log, and cert files...[/bold yellow]"
            )
        with console.status(status_msg, spinner="dots"):
            err, msg = setup_obj.clean_services(service_list, include_certs=certs)

        if err is not None:
            raise click.ClickException(msg)

        console.print(f"[green]✅ {msg}[/green]")

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


@services.group()
def user():
    """User account management for services."""


def _setup_service_users(
    console: Console, service_name: str, setup_func: Callable
) -> bool:
    """Set up users for a service and print status.

    Returns:
        bool: True if successful, False if there were errors
    """
    console.print(f"\n[cyan]Adding users to {service_name}...[/cyan]")
    success, msg = setup_func()
    if not success:
        error_line = msg.split("\n")[0]
        console.print(f"[red]{service_name}: {error_line}[/red]", style="bold")
    else:
        # Check if this is a skip/warning (service not installed) vs. success
        if "not installed" in msg.lower():
            console.print(f"[yellow]⚠️  {service_name}: {msg}[/yellow]")
        else:
            console.print(f"[green]✅ {service_name}: {msg}[/green]")
    return success


@user.command()
@click.option(
    "--services", "-s", "service_names", help="Comma-separated list of services to stop"
)
def add(service_names):
    """
    Add user accounts to InfluxDB, RabbitMQ, and ThingsBoard.
    Reads config/credentials.csv and creates accounts in all services.
    Example:
        dtaas-services user add
    """

    console = Console()
    console.print("[bold cyan]Adding users from CSV file...[/bold cyan]")
    service_list = _parse_service_list(service_names)

    results = []

    if not service_list:
        results.append(
            _setup_service_users(console, "InfluxDB", influxdb.setup_influxdb_users)
        )
        results.append(
            _setup_service_users(console, "RabbitMQ", rabbitmq.setup_rabbitmq_users)
        )
        results.append(
            _setup_service_users(
                console, "ThingsBoard", thingsboard.setup_thingsboard_users
            )
        )
    else:
        for s in service_list:
            if s.lower() == "influxdb":
                results.append(
                    _setup_service_users(
                        console, "InfluxDB", influxdb.setup_influxdb_users
                    )
                )
            elif s.lower() == "rabbitmq":
                results.append(
                    _setup_service_users(
                        console, "RabbitMQ", rabbitmq.setup_rabbitmq_users
                    )
                )
            elif s.lower() == "thingsboard":
                results.append(
                    _setup_service_users(
                        console, "ThingsBoard", thingsboard.setup_thingsboard_users
                    )
                )
            else:
                console.print(f"[yellow]Unknown service: {s}, skipping...[/yellow]")

    # Check if all services succeeded
    all_success = all(results)
    if all_success:
        console.print("\n[bold green]✅ Users added successfully![/bold green]")
    else:
        failed_count = sum(1 for r in results if not r)
        console.print(
            f"\n[bold yellow]⚠️  User addition completed with {failed_count} error(s). See messages above.[/bold yellow]"
        )


if __name__ == "__main__":
    services()
