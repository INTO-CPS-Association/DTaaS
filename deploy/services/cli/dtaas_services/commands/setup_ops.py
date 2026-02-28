"""Setup and installation commands, generate-project, setup, install."""

from pathlib import Path
from typing import Callable
import click
from rich.console import Console
import dtaas_services
from ..pkg.cert import copy_certs
from ..pkg.services.mongodb import permissions_mongodb
from ..pkg.services.influxdb.influxdb import permissions_influxdb
from ..pkg.services.rabbitmq import permissions_rabbitmq
from ..pkg.lib import Service
from ..pkg.utils import check_root_unix
from ..pkg.template import generate_project_structure
from ..pkg.services.thingsboard.permissions import permissions_thingsboard
from ..pkg.services.postgres.postgres import wait_for_postgres_ready
from ..pkg.services.thingsboard.tb_utility import run_thingsboard_install


def _run_setup_step(console: Console, step_name: str, step_func: Callable):
    """Helper to run a setup step with console output."""
    console.print(f"\n[cyan]{step_name}...[/cyan]")
    success, msg = step_func()
    if not success:
        raise click.ClickException(f"{step_name} failed: {msg}")
    console.print(f"[green]✅ {step_name} completed:[/green] {msg}")


@click.command()
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


@click.command()
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
        console.print(
            "     Run ThingsBoard installation (starts PostgreSQL "
            "automatically): dtaas-services install"
        )
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


def _validate_service_name(service: str) -> None:
    """Validate that the service name is supported.

    Raises:
        click.ClickException: If service is not supported
    """
    if service and service.lower() not in ["thingsboard", "thingsboard-ce"]:
        raise click.ClickException(
            f"Installation is only supported for ThingsBoard. Got: {service}"
        )


def _ensure_postgres_running(console: Console, service_obj: Service) -> object:
    """Start PostgreSQL if needed and return docker client.

    Returns:
        docker_client

    Raises:
        click.ClickException: If PostgreSQL fails to start
    """
    console.print("[cyan]Ensuring PostgreSQL is running...[/cyan]")
    err, msg = service_obj.manage_services("start", ["postgres"])
    if err is not None:
        raise click.ClickException(f"Failed to start PostgreSQL: {msg}")
    console.print(f"[green]{msg}[/green]")
    return service_obj.docker


@click.command()
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
        _validate_service_name(service)

        service_obj = Service()
        docker = _ensure_postgres_running(console, service_obj)

        wait_for_postgres_ready(console, docker)
        run_thingsboard_install(console, docker)

        console.print("[green]✅ ThingsBoard installation completed![/green]")
        console.print("[cyan]Next steps:[/cyan]")
        console.print("  1. Start ThingsBoard: dtaas-services start -s thingsboard-ce")
        console.print("  2. Add users: dtaas-services user add -s thingsboard")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except Exception as e:
        raise click.ClickException(f"ThingsBoard installation failed: {str(e)}") from e
