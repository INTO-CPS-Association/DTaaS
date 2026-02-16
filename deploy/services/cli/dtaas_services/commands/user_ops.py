"""User management commands, user add."""

from typing import Callable
from dataclasses import dataclass
import click
from rich.console import Console
from ..pkg.services import influxdb, rabbitmq
from ..pkg.services.thingsboard import setup_thingsboard_users
from .utility import parse_service_list


@dataclass
class UserSetupResult:
    """Result of setting up users for a service."""

    service_name: str
    success: bool
    message: str


def _print_service_user_result(console: Console, result: UserSetupResult) -> None:
    """Print the result of setting up service users."""
    if not result.success:
        error_line = result.message.split("\n")[0]
        console.print(f"[red]{result.service_name}: {error_line}[/red]", style="bold")
    elif "not installed" in result.message.lower():
        console.print(f"[yellow]⚠️  {result.service_name}: {result.message}[/yellow]")
    else:
        console.print(f"[green]✅ {result.service_name}: {result.message}[/green]")


def _setup_service_users(
    console: Console, service_name: str, setup_func: Callable
) -> bool:
    """Set up users for a service and print status.

    Returns:
        bool: True if successful, False if there were errors
    """
    console.print(f"\n[cyan]Adding users to {service_name}...[/cyan]")
    success, msg = setup_func()
    result = UserSetupResult(service_name, success, msg)
    _print_service_user_result(console, result)
    return success


def _setup_all_service_users(console: Console) -> list[bool]:
    """Set up users for all services.

    Returns:
        List of success flags for each service
    """
    return [
        _setup_service_users(console, "InfluxDB", influxdb.setup_influxdb_users),
        _setup_service_users(console, "RabbitMQ", rabbitmq.setup_rabbitmq_users),
        _setup_service_users(console, "ThingsBoard", setup_thingsboard_users),
    ]


def _setup_specific_service(console: Console, service_name: str) -> bool | None:
    """Set up users for a specific service.

    Returns:
        Success flag, or None if service is unknown
    """
    service_map = {
        "influxdb": ("InfluxDB", influxdb.setup_influxdb_users),
        "rabbitmq": ("RabbitMQ", rabbitmq.setup_rabbitmq_users),
        "thingsboard": ("ThingsBoard", setup_thingsboard_users),
    }

    service_lower = service_name.lower()
    if service_lower in service_map:
        display_name, setup_func = service_map[service_lower]
        return _setup_service_users(console, display_name, setup_func)

    console.print(f"[yellow]Unknown service: {service_name}, skipping...[/yellow]")
    return None


def _print_user_add_summary(results: list[bool]) -> None:
    """Print summary of user addition results."""
    console = Console()
    # Filter out None values from unknown services
    valid_results = [r for r in results if r is not None]

    if all(valid_results):
        console.print("\n[bold green]✅ Users added successfully![/bold green]")
    else:
        failed_count = sum(1 for r in valid_results if not r)
        console.print(
            f"\n[bold yellow]⚠️  User addition completed \n"
            f"with {failed_count} error(s). See messages above.[/bold yellow]"
        )


@click.command()
@click.option(
    "--services", "-s", "service_names", help="Comma-separated list of services"
)
def add(service_names):
    """
    Add user accounts to InfluxDB, RabbitMQ, and ThingsBoard.
    Reads config/credentials.csv and creates accounts in all services.
    Example:
        dtaas-services user add
        dtaas-services user add -s thingsboard
    """
    console = Console()
    console.print("[bold cyan]Adding users from CSV file...[/bold cyan]")
    service_list = parse_service_list(service_names)

    if not service_list:
        results = _setup_all_service_users(console)
    else:
        results = [_setup_specific_service(console, s) for s in service_list]

    _print_user_add_summary(results)
