"""CLI commands for DTaaS services management"""
import sys
import os
import platform

import click

from .pkg.config import Config
from .pkg.setup import ServiceSetup
from .pkg import influxdb
from .pkg import rabbitmq


def check_root_unix() -> None:
    """Check if script is run as root on Unix systems."""
    os_type = platform.system().lower()
    if os_type in ("linux", "darwin"):
        try:
            is_root = os.geteuid() == 0
        except AttributeError:
            is_root = False
        if not is_root:
            click.echo(
                "Error: This command must be run as root on Linux/MacOS.",
                err=True
            )
            sys.exit(1)


@click.group()
def cli():
    """DTaaS Services Management CLI"""


@cli.command()
def setup():
    """
    Set up and start all DTaaS platform services.

    This command will:
    - Copy TLS certificates
    - Configure MongoDB, InfluxDB, and RabbitMQ
    - Set proper file permissions
    - Start all services using Docker Compose
    """
    check_root_unix()

    try:
        config = Config()
        service_setup = ServiceSetup(config)

        # Execute setup steps
        steps = [
            ("Copying certificates", service_setup.copy_certs),
            ("Setting up MongoDB", service_setup.setup_mongodb),
            ("Setting up InfluxDB", service_setup.setup_influxdb),
            ("Setting up RabbitMQ", service_setup.setup_rabbitmq),
            ("Starting services", service_setup.start_services),
        ]

        for step_name, step_func in steps:
            click.echo(f"\n{step_name}...")
            success, message = step_func()

            if not success:
                click.echo(f"ERROR: {message}", err=True)
                sys.exit(1)

            click.echo(f"OK: {message}")

        click.echo("\n✓ Services setup completed successfully!")

    except Exception as e:
        click.echo(f"ERROR: {e}", err=True)
        sys.exit(1)


@cli.command()
def start():
    """
    Start the DTaaS platform services.

    This command starts all services using Docker Compose.
    """
    try:
        config = Config()
        service_setup = ServiceSetup(config)

        click.echo("Starting services...")
        success, message = service_setup.start_services()

        if not success:
            click.echo(f"ERROR: {message}", err=True)
            sys.exit(1)

        click.echo(f"OK: {message}")
        click.echo("\n✓ Services started successfully!")

    except Exception as e:
        click.echo(f"ERROR: {e}", err=True)
        sys.exit(1)


@cli.group()
def user():
    """User management commands for services"""


@user.command()
def add():
    """
    Add users to InfluxDB and RabbitMQ services.

    Before running this command, create a credentials file at:
    ../manual/config/credentials.csv

    The file should contain columns: username,password
    """
    try:
        config = Config()
        credentials_file = config.base_dir / "config" / "credentials.csv"

        if not credentials_file.exists():
            click.echo(
                f"ERROR: Credentials file not found: {credentials_file}\n"
                f"Please create it using the template at "
                f"{config.base_dir / 'config' / 'credentials.csv.template'}",
                err=True
            )
            sys.exit(1)

        # Add InfluxDB users
        click.echo("\nAdding users to InfluxDB...")
        success, message = influxdb.add_influxdb_users(credentials_file)
        if not success:
            click.echo(f"ERROR: {message}", err=True)
            sys.exit(1)
        click.echo(f"OK: {message}")

        # Add RabbitMQ users
        click.echo("\nAdding users to RabbitMQ...")
        success, message = rabbitmq.add_rabbitmq_users(credentials_file)
        if not success:
            click.echo(f"ERROR: {message}", err=True)
            sys.exit(1)
        click.echo(f"OK: {message}")

        click.echo("\n✓ Users added successfully to all services!")

    except Exception as e:
        click.echo(f"ERROR: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    cli()
