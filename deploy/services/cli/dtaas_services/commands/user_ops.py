"""User management commands, user add."""

from typing import Callable, Sequence
from dataclasses import dataclass
import click
from rich.console import Console
from ..pkg.services.influxdb import influxdb
from ..pkg.services import rabbitmq
from ..pkg.services.mongodb import setup_mongodb_users
from ..pkg.services.postgres import setup_postgres_users
from ..pkg.services.thingsboard import (
    setup_thingsboard_users,
    reset_thingsboard_password,
)
from ..pkg.services.gitlab import (
    setup_gitlab_users,
    reset_gitlab_password,
    is_gitlab_running,
)
from ..pkg.services.thingsboard import is_thingsboard_running
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
        _setup_service_users(console, "MongoDB", setup_mongodb_users),
        _setup_service_users(console, "PostgreSQL", setup_postgres_users),
        _setup_service_users(console, "ThingsBoard", setup_thingsboard_users),
        _setup_service_users(console, "GitLab", setup_gitlab_users),
    ]


def _setup_specific_service(console: Console, service_name: str) -> bool | None:
    """Set up users for a specific service.

    Returns:
        Success flag, or None if service is unknown
    """
    service_map = {
        "influxdb": ("InfluxDB", influxdb.setup_influxdb_users),
        "rabbitmq": ("RabbitMQ", rabbitmq.setup_rabbitmq_users),
        "mongodb": ("MongoDB", setup_mongodb_users),
        "postgres": ("PostgreSQL", setup_postgres_users),
        "thingsboard": ("ThingsBoard", setup_thingsboard_users),
        "gitlab": ("GitLab", setup_gitlab_users),
    }

    service_lower = service_name.lower()
    if service_lower in service_map:
        display_name, setup_func = service_map[service_lower]
        return _setup_service_users(console, display_name, setup_func)

    console.print(f"[yellow]Unknown service: {service_name}, skipping...[/yellow]")
    return None


def _print_user_add_summary(results: Sequence[bool | None]) -> None:
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
    Add user accounts to InfluxDB, RabbitMQ, MongoDB, PostgreSQL, ThingsBoard, and GitLab.
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


def _reset_password_for_service(console: Console, service_name: str) -> bool | None:
    """Reset password for a specific service.

    Returns:
        True if successful, False on error, None if service unknown
    """
    service_lower = service_name.lower()
    if service_lower == "thingsboard" and is_thingsboard_running():
        console.print("\n[cyan]Resetting sysadmin password for ThingsBoard...[/cyan]")
        success, msg = reset_thingsboard_password()
        result = UserSetupResult("ThingsBoard", success, msg)
        _print_service_user_result(console, result)
        return success

    if service_lower == "gitlab" and is_gitlab_running():
        console.print("\n[cyan]Resetting root password for GitLab...[/cyan]")
        success, msg = reset_gitlab_password()
        result = UserSetupResult("GitLab", success, msg)
        _print_service_user_result(console, result)
        return success

    console.print(
        f"[yellow]Password reset is not supported for: "
        f"{service_name}, or the service is not running.[/yellow]"
    )
    return None


def _print_reset_password_summary(results: list[bool | None]) -> None:
    """Print summary of password reset results."""
    console = Console()
    valid_results = [r for r in results if r is not None]

    if not valid_results:
        console.print(
            "\n[bold yellow]⚠️  No supported services specified "
            "for password reset.[/bold yellow]"
        )
        return

    if all(valid_results):
        console.print("\n[bold green]✅ Password reset completed ![/bold green]")
    else:
        failed_count = sum(1 for r in valid_results if not r)
        console.print(
            f"\n[bold yellow]⚠️  Password reset completed "
            f"with {failed_count} error(s). "
            f"See messages above.[/bold yellow]"
        )


@click.command(name="reset-password")
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services (default: thingsboard)",
    required=False,
    default=None,
)
def reset_password(service_names):
    """
    Reset admin passwords for services.
    Currently supports: thingsboard, gitlab.
    Example:
        dtaas-services user reset-password
        dtaas-services user reset-password -s thingsboard
        dtaas-services user reset-password -s gitlab
    """
    console = Console()
    console.print("[bold cyan]Resetting service passwords...[/bold cyan]")
    service_list = parse_service_list(service_names) or ["thingsboard", "gitlab"]

    results = [_reset_password_for_service(console, s) for s in service_list]
    _print_reset_password_summary(results)
