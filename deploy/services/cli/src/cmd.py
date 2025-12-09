import click

from .pkg.config import Config
from .pkg.setup import ServicesSetup
from .pkg import influxdb, rabbitmq

@click.group()
def services():
    """Manage DTaaS platform services."""
    pass

@services.command()
def setup():
    """
    Set up TLS certificates and permissions for services.
    
    This command runs all these steps:
    - Copies TLS certificates to the correct locations
    - Sets up MongoDB certificates and permissions
    - Sets up InfluxDB certificates and permissions
    - Sets up RabbitMQ certificates and permissions
    - Starts the services using Docker Compose
    """
    try:
        config = Config()
        setup_obj = ServicesSetup(config)
        setup_obj.check_root_unix()
        click.echo("Starting service setup....")

        steps = [
            ("Copying certificates", setup_obj.copy_certs),
            ("Configuring MongoDB", setup_obj.permissions_mongodb),
            ("Configuring InfluxDB", setup_obj.permissions_influxdb),
            ("Configuring RabbitMQ", setup_obj.permissions_rabbitmq),
        ]

        for step_name, step_func in steps:
            click.echo(f"\n{step_name}...")
            success, msg = step_func()
            if not success:
                raise click.ClickException(f"{step_name} failed: {msg}")

        click.echo("\nService setup completed.")
        err, msg = setup_obj.start_services()
        if err is not None:
            raise click.ClickException(f"Starting services failed: {msg}")
        click.echo("\nStarting services...")

    except FileNotFoundError as e:
        raise click.ClickException(str(e))
    except RuntimeError as e:
        raise click.ClickException(str(e))


@services.command()
def start():
    """This command only starts the platform services."""
    try:
        config = Config()
        setup_obj = ServicesSetup(config)

        click.echo("Starting services...")
        err, msg = setup_obj.start_services()
        if err is not None:
            raise click.ClickException(msg)

        click.echo(msg)
    except FileNotFoundError as e:
        raise click.ClickException(str(e))
    except RuntimeError as e:
        raise click.ClickException(str(e))
    

@services.command()
def stop():
    """This command only stops the platform services."""
    try:
        config = Config()
        setup_obj = ServicesSetup(config)
        click.echo("Stopping services...")
        err, msg = setup_obj.stop_services()
        if err is not None:
            raise click.ClickException(msg)
        click.echo(msg)

    except Exception as e:
        raise click.ClickException(str(e))


@services.command()
def status():
    """This command shows the status of the platform services."""
    try:
        config = Config()
        setup_obj = ServicesSetup(config)
        err, msg = setup_obj.get_status()
        if err is not None:
            raise click.ClickException(msg)
        click.echo(msg)

    except Exception as e:
        raise click.ClickException(str(e))


@services.group()
def user():
    """User account management for services."""
    pass


@user.command()
def add():
    """
    Add user accounts to InfluxDB and RabbitMQ.
    Reads config/credentials.csv and creates accounts in both services.
    Example:
        dtaas-services user add
    """
    click.echo("Adding users from CSV file...")
    click.echo("\nAdding users to InfluxDB...")
    success, msg = influxdb.setup_influxdb_users()
    if not success:
        click.echo(f"InfluxDB: Failed - {msg}", err=True)
    else:
        click.echo(f"InfluxDB: {msg}")

    click.echo("\nAdding users to RabbitMQ...")
    success, msg = rabbitmq.setup_rabbitmq_users()
    if not success:
        click.echo(f"RabbitMQ: Failed - {msg}", err=True)
    else:
        click.echo(f"RabbitMQ: {msg}")

    click.echo("\nAdding user completed!")


if __name__ == "__main__":
    services()
