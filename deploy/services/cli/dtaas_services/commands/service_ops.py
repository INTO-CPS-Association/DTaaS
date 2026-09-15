"""Service commands, install, start, stop, restart, status, remove, clean."""

import json
from typing import Optional
import click
from rich.console import Console
from ..pkg.lib import Service
from ..pkg.formatter import build_status_json, format_container_status
from ..pkg.password_store import remove_service_passwords
from ..pkg.utils import check_root_unix
from .install_helpers import install_services, resolve_install_targets
from .utility import (
    services_command_runner,
    parse_service_list,
    build_clean_confirmation_prompt,
    check_running_services_for_clean,
    print_clean_status,
    build_clean_status_message,
    _handle_operation_result,
)


@click.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help=(
        "Comma-separated list of services to install (thingsboard, gitlab). "
        "Installs both if not specified."
    ),
)
@click.option(
    "--service",
    "legacy_service",
    hidden=True,
    help="Deprecated spelling of --services.",
)
def install(service_names, legacy_service):
    """
    Install service database schema or run post-install setup.

    Prerequisites:
    - dtaas-services host setup must be completed

    For ThingsBoard: automatically starts PostgreSQL if needed, then
    initializes the database and creates the default system administrator
    account.

    For GitLab: waits for readiness, retrieves the root password, creates
    a Personal Access Token, and registers OAuth application tokens.

    If no service is specified, both ThingsBoard and GitLab are installed.

    Must be run only once after initial setup.
    """
    selected = service_names or legacy_service
    try:
        check_root_unix()
        targets = resolve_install_targets(parse_service_list(selected))
        install_services(Console(), Service(), targets)
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except click.ClickException:
        raise
    except Exception as e:
        raise click.ClickException(
            f"Installation failed for {selected}: {str(e)}"
        ) from e


@click.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to start",
)
def start(service_names):
    """Start the platform services."""
    services_command_runner("start", service_names)


@click.command()
@click.option(
    "--services", "-s", "service_names", help="Comma-separated list of services to stop"
)
def stop(service_names):
    """Stop the platform services."""
    services_command_runner("stop", service_names)


@click.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to restart",
)
def restart(service_names):
    """Restart the platform services."""
    services_command_runner("restart", service_names)


def _print_status(containers: list, as_json: bool) -> None:
    """Print container status as a rich table or as JSON."""
    if as_json:
        click.echo(json.dumps(build_status_json(containers), indent=2))
        return
    format_container_status(containers, Console())


@click.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to check",
)
@click.option(
    "--json",
    "as_json",
    is_flag=True,
    default=False,
    help="Print status as JSON keyed by service name.",
)
def status(service_names, as_json):
    """Show the status of the platform services."""
    try:
        setup_obj = Service()

        service_list = parse_service_list(service_names)

        err, containers = setup_obj.get_status(service_list)
        if err is not None:
            error_msg = f"Failed to get status: {str(err)}"
            raise click.ClickException(error_msg)

        _print_status(containers, as_json)

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


def _clean_passwords(service_list: Optional[list[str]]) -> None:
    """Remove password-store entries for removed services."""
    targets = service_list or ["thingsboard", "thingsboard-ce", "gitlab"]
    for svc in targets:
        remove_service_passwords(svc)


@click.command()
@click.option(
    "--services",
    "-s",
    "service_names",
    help="Comma-separated list of services to remove",
)
@click.option(
    "--volumes",
    "-v",
    is_flag=True,
    help="Also remove the service volumes. Prefer --volumes; -v is kept as an alias.",
)
def remove(service_names, volumes):
    """Remove the platform services and optionally their volumes."""
    try:
        setup_obj = Service()
        console = Console()
        service_list = parse_service_list(service_names)
        _print_remove_status(console, service_list)
        with console.status(
            "[bold red]Removing containers...[/bold red]", spinner="dots"
        ):
            err, msg = setup_obj.remove_services(service_list, remove_volumes=volumes)
        if err is not None:
            raise click.ClickException(msg)
        _clean_passwords(service_list)
        console.print(f"[green]✅ {msg}[/green]")

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e


@click.command()
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
        "Also delete copied TLS cert files under certs. "
        "This will require re-running dtaas-services host setup."
    ),
)
def clean(service_names, certs):
    """
    Clean all temporary files and data for services.

    This removes all files from data and log directories for the specified services,
    including .gitkeep files. Useful for preparing to reinstall services.

    By default, certificates under certs are preserved. Use --certs to delete them.

    Services must be stopped before cleaning.
    """
    try:
        setup_obj = Service()
        console = Console()
        service_list = parse_service_list(service_names)

        prompt = build_clean_confirmation_prompt(certs)
        click.confirm(prompt, default=False, abort=True)

        running_services = setup_obj.get_running_services()
        check_running_services_for_clean(console, running_services, service_list)

        print_clean_status(console, service_list)

        status_msg = build_clean_status_message(certs)
        with console.status(status_msg, spinner="dots"):
            err, msg = setup_obj.clean_services(service_list, include_certs=certs)

        _handle_operation_result(console, err, msg)

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
