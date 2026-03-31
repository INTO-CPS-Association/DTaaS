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
from ..pkg.services.thingsboard.sysadmin_util import update_sysadmin_email_in_db
from ..pkg.services.gitlab import setup_gitlab


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
        console.print("     dtaas-services install -s thingsboard")
        console.print("  3. Install GitLab (if using it):")
        console.print("     dtaas-services install -s gitlab")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


SUPPORTED_INSTALL_SERVICES = ["thingsboard", "thingsboard-ce", "gitlab"]


def _validate_service_name(service: str | None) -> None:
    """Validate that the service name is supported for installation.

    Raises:
        click.ClickException: If service is not supported
    """
    if service is not None and service.lower() not in SUPPORTED_INSTALL_SERVICES:
        raise click.ClickException(
            f"Installation is supported for ThingsBoard and GitLab. Got: {service}"
        )


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
    "It typically takes 5\u201310 minutes after first start.[/yellow]\n"
    "[cyan]Next steps:[/cyan]\n"
    "  1. Check health:  dtaas-services status -s gitlab\n"
    "     It will be 'starting' or 'not-ready' while it's initializing.\n"
    "  2. When GitLab health shows 'running', re-run:\n"
    "     dtaas-services install -s gitlab"
)


def _install_gitlab(console: Console, service_obj: Service) -> None:
    """Run GitLab post-install setup flow."""
    docker = _ensure_service_running(console, service_obj, "gitlab")
    success, msg = setup_gitlab(console, docker)
    if success:
        console.print(f"[green]\u2705 {msg}[/green]")
        return
    if msg in GITLAB_NOT_READY_STATUSES:
        console.print(GITLAB_NOT_READY_HINT)
        return
    raise click.ClickException(f"GitLab installation failed: {msg}")


def _install_selected_services(
    console: Console, service_obj: Service, service: str | None
) -> None:
    """Install one or both supported services based on selection."""
    if service is None:
        _install_thingsboard(console, service_obj)
        _install_gitlab(console, service_obj)
        return

    if service.lower() == "gitlab":
        _install_gitlab(console, service_obj)
        return

    _install_thingsboard(console, service_obj)


@click.command()
@click.option(
    "-s",
    "--service",
    default=None,
    help="Service to install ('thingsboard' or 'gitlab'). Installs both if not specified.",
)
def install(service):
    """
    Install service database schema or run post-install setup.

    Prerequisites:
    - dtaas-services setup must be completed

    For ThingsBoard: automatically starts PostgreSQL if needed, then
    initializes the database and creates the default system administrator
    account.

    For GitLab: waits for readiness, retrieves the root password, creates
    a Personal Access Token, and registers OAuth application tokens.

    If no service is specified, both ThingsBoard and GitLab are installed.

    Must be run only once after initial setup.
    """
    try:
        check_root_unix()
        console = Console()
        _validate_service_name(service)

        service_obj = Service()
        _install_selected_services(console, service_obj, service)
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except click.ClickException:
        raise
    except Exception as e:
        raise click.ClickException(
            f"Installation failed for {service}: {str(e)}"
        ) from e
