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

        click.echo("Starting service setup....")

        steps = [
            ("Copying certificates", setup_obj.copy_certs),
            ("Configuring MongoDB", setup_obj.permissions_mongodb),
            ("Configuring InfluxDB", setup_obj.permissions_influxdb),
            ("Configuring RabbitMQ", setup_obj.permissions_rabbitmq),
            ("Starting services", setup_obj.start_services),    
        ]

        for step_name, step_func in steps:
            click.echo(f"\n{step_name}...")
            success, msg = step_func()
            if not success:
                raise click.ClickException(f"{step_name} failed: {msg}")
        
        click.echo("\nService setup completed.")
        
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
        success, msg = setup_obj.start_services()
        if not success:
            raise click.ClickException(msg)
        
        click.echo(f"{msg}")
        
    except Exception as e:
        raise click.ClickException(str(e))
    

@services.command()
def stop():
    """This command only stops the platform services."""
    try:
        config = Config()
        setup_obj = ServicesSetup(config)
        
        click.echo("Stopping services...")
        success, msg = setup_obj.stop_services()
        if not success:
            raise click.ClickException(msg)
        
        click.echo(f"{msg}")
        
    except Exception as e:
        raise click.ClickException(str(e))
    

@services.command()
def status():
    """This command shows the status of the platform services."""
    try:
        config = Config()
        setup_obj = ServicesSetup(config)
        
        success, msg = setup_obj.get_status()
        if not success:
            raise click.ClickException(msg)
        
        click.echo(f"{msg}")
        
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
    
    # Add to InfluxDB
    click.echo("\nAdding users to InfluxDB...")
    err, msg = influxdb.create_accounts()
    if err:
        click.echo(f"InfluxDB: {msg}", err=True)
    else:
        click.echo(f"InfluxDB: {msg}")
    
    # Add to RabbitMQ
    click.echo("\nAdding users to RabbitMQ...")
    err, msg = rabbitmq.create_accounts()
    if err:
        click.echo(f"RabbitMQ: {msg}", err=True)
    else:
        click.echo(f"RabbitMQ: {msg}")
    
    click.echo("\nAdding user completed!")


if __name__ == "__main__":
    services()
