"""DTaaS Services CLI commands"""
import click
import shutil
import dtaas_services
from pathlib import Path
from .pkg.config import Config
from .pkg.cert import copy_certs
from .pkg.mongodb import permissions_mongodb
from .pkg.influxdb import permissions_influxdb
from .pkg.rabbitmq import permissions_rabbitmq
from .pkg.service import Service
from .pkg.utils import check_root_unix
from .pkg import influxdb, rabbitmq



@click.group()
def services():
    """Manage DTaaS platform services."""
    pass


def _copy_directory_or_file(src_path: Path, dest_path: Path, item_name: str) -> None:
    """
    Copy a directory or file from source to destination.
    
    Args:
        src_path: Source path
        dest_path: Destination path
        item_name: Name of the item for display purposes
    """
    if not src_path.exists():
        click.echo(f"  Warning: {item_name} not found in package", err=True)
        return
    
    if dest_path.exists():
        click.echo(f"  Skipping {item_name} (already exists)")
        return
    
    if src_path.is_dir():
        shutil.copytree(src_path, dest_path)
        click.echo(f"  Created {item_name}/")
    elif src_path.is_file():
        shutil.copy2(src_path, dest_path)
        click.echo(f"  Created {item_name}")


def _copy_template_to_config(config_dir: Path, template_name: str, actual_name: str) -> None:
    """
    Copy a template file to its actual config file if it doesn't exist.
    
    Args:
        config_dir: Directory containing config files
        template_name: Name of the template file
        actual_name: Name of the actual config file
    """
    template_file = config_dir / template_name
    actual_file = config_dir / actual_name
    
    if template_file.exists() and not actual_file.exists():
        shutil.copy2(template_file, actual_file)
        click.echo(f"  Created config/{actual_name} from template")


@services.command()
@click.option('--path', default='.', help='Directory to generate project structure')
def generate_project(path):
    """
    Generate project structure with template config, data directories, and compose file.
    
    This creates the necessary directory structure and copies template files
    from the installed package so you can run dtaas-services commands.
    
    Example:
        dtaas-services generate-project
        dtaas-services generate-project --path /path/to/project
    """
    try:
        target_dir = Path(path).resolve()
        target_dir.mkdir(parents=True, exist_ok=True)
        # Get package root directory (where config, data, compose files are bundled)
        package_root = Path(dtaas_services.__file__).parent
        
        # Copy the following directories and files to the users target directory 
        items_to_copy = [('config', 'config'), ('data', 'data'),
            ('compose.services.secure.yml', 'compose.services.secure.yml')]
        
        click.echo(f"Generating project structure in {target_dir}...")
        
        for src_item, dest_item in items_to_copy:
            src_path = package_root / src_item
            dest_path = target_dir / dest_item
            _copy_directory_or_file(src_path, dest_path, dest_item)
        
        # Copy template files to actual config files if they don't exist
        config_dir = target_dir / "config"
        template_mappings = [('services.env.template', 'services.env'),
            ('credentials.csv.template', 'credentials.csv')]
        
        for template_name, actual_name in template_mappings:
            _copy_template_to_config(config_dir, template_name, actual_name)
        
        click.echo(f"\nProject structure generated successfully in {target_dir}!")        
    except Exception as e:
        raise click.ClickException(f"Failed to generate project: {e}") from e
    

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
        setup_obj = Service()
        check_root_unix()
        click.echo("Starting service setup....")

        steps = [
            ("Copying certificates", copy_certs),
            ("Configuring MongoDB", permissions_mongodb),
            ("Configuring InfluxDB", permissions_influxdb),
            ("Configuring RabbitMQ", permissions_rabbitmq),
        ]

        for step_name, step_func in steps:
            click.echo(f"\n{step_name}...")
            success, msg = step_func()
            if not success:
                raise click.ClickException(f"{step_name} failed: {msg}")

        click.echo("\nStarting services...")
        err, msg = setup_obj.start_services()
        if err is not None:
            raise click.ClickException(f"Starting services failed: {msg}")
        click.echo("Services started successfully.")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to start')
def start(service_names):
    """Start the platform services."""
    try:
        config = Config()
        setup_obj = Service()

        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        if service_list:
            click.echo(f"Starting services: {', '.join(service_list)}...")
        else:
            click.echo("Starting all services...")
            
        err, msg = setup_obj.start_services(service_list)
        if err is not None:
            raise click.ClickException(msg)

        click.echo(msg)
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to stop')
def stop(service_names):
    """Stop the platform services."""
    try:
        config = Config()
        setup_obj = Service()
        
        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        if service_list:
            click.echo(f"Stopping services: {', '.join(service_list)}...")
        else:
            click.echo("Stopping all services...")
            
        err, msg = setup_obj.stop_services(service_list)
        if err is not None:
            raise click.ClickException(msg)
        click.echo(msg)

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to check')
def status(service_names):
    """Show the status of the platform services."""
    try:
        config = Config()
        setup_obj = Service()
        
        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        err, msg = setup_obj.get_status(service_list)
        if err is not None:
            raise click.ClickException(msg)
        click.echo(msg)

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to restart')
def restart(service_names):
    """Restart the platform services."""
    try:
        config = Config()
        setup_obj = Service()
        
        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        if service_list:
            click.echo(f"Restarting services: {', '.join(service_list)}...")
        else:
            click.echo("Restarting all services...")
            
        err, msg = setup_obj.restart_services(service_list)
        if err is not None:
            raise click.ClickException(msg)
        click.echo(msg)

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


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
