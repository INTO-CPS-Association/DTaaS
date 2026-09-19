"""Host commands, host setup."""

from typing import Callable
import click
from rich.console import Console
from ..pkg.cert import copy_certs
from ..pkg.services.mongodb import permissions_mongodb
from ..pkg.services.influxdb.influxdb import permissions_influxdb
from ..pkg.services.rabbitmq import permissions_rabbitmq
from ..pkg.services.thingsboard.permissions import permissions_thingsboard
from ..pkg.utils import check_root_unix


def _run_setup_step(console: Console, step_name: str, step_func: Callable):
    """Helper to run a setup step with console output."""
    console.print(f"\n[cyan]{step_name}...[/cyan]")
    success, msg = step_func()
    if not success:
        raise click.ClickException(f"{step_name} failed: {msg}")
    console.print(f"[green]✅ {step_name} completed:[/green] {msg}")


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
        console.print("  1. Start services: dtaas-services service start")
        console.print("  2. Install ThingsBoard (if using it):")
        console.print("     dtaas-services service install -s thingsboard")
        console.print("  3. Install GitLab (if using it):")
        console.print("     dtaas-services service install -s gitlab")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
