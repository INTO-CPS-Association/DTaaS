"""DTaaS Services CLI commands"""
import click
import dtaas_services
from pathlib import Path
from rich.console import Console
from .pkg.cert import copy_certs
from .pkg.mongodb import permissions_mongodb
from .pkg.influxdb import permissions_influxdb
from .pkg.rabbitmq import permissions_rabbitmq
from .pkg.service import Service
from .pkg.utils import check_root_unix
from .pkg.template import generate_project_structure
from .pkg.formatter import format_container_status
from .pkg import influxdb, rabbitmq



@click.group()
def services():
    """Manage DTaaS platform services."""
    pass


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
    target_dir = Path(path).resolve()
    package_root = Path(dtaas_services.__file__).parent
    
    success, message = generate_project_structure(target_dir, package_root)
    
    if not success:
        raise click.ClickException(message)
    
    click.echo(message)
    

@services.command()
def setup():
    """
    Set up TLS certificates and permissions for services.
    
    This command runs all these steps:
    - Copies TLS certificates to the correct locations
    - Sets up MongoDB certificates and permissions
    - Sets up InfluxDB certificates and permissions
    - Sets up RabbitMQ certificates and permissions
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
        ]

        for step_name, step_func in steps:
            console.print(f"\n[cyan]{step_name}...[/cyan]")
            success, msg = step_func()
            if not success:
                raise click.ClickException(f"{step_name} failed: {msg}")
            console.print(f"[green]✅ {step_name} completed:[/green] {msg}")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to start')
def start(service_names):
    """Start the platform services."""
    try:
        setup_obj = Service()
        console = Console()

        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        if service_list:
            console.print(f"[cyan]Starting services:[/cyan] {', '.join(service_list)}...")
        else:
            console.print("[cyan]Starting all services...[/cyan]")
        
        with console.status("[bold cyan]Starting containers...[/bold cyan]", spinner="dots"):
            err, msg = setup_obj.start_services(service_list)
        
        if err is not None:
            raise click.ClickException(msg)

        console.print(f"[green]✅ {msg}[/green]")
    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to stop')
def stop(service_names):
    """Stop the platform services."""
    try:
        setup_obj = Service()
        console = Console()
        
        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        if service_list:
            console.print(f"[yellow]Stopping services:[/yellow] {', '.join(service_list)}...")
        else:
            console.print("[yellow]Stopping all services...[/yellow]")
        
        with console.status("[bold yellow]Stopping containers...[/bold yellow]", spinner="dots"):
            err, msg = setup_obj.stop_services(service_list)
        
        if err is not None:
            raise click.ClickException(msg)
        console.print(f"[green]✅ {msg}[/green]")

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to check')
def status(service_names):
    """Show the status of the platform services."""
    try:
        setup_obj = Service()
        console = Console()
        
        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        err, containers = setup_obj.get_status(service_list)
        if err is not None:
            raise click.ClickException(f"Failed to get status: {str(err)}")
        
        # Use rich formatter to display status
        format_container_status(containers, console)

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to restart')
def restart(service_names):
    """Restart the platform services."""
    try:
        setup_obj = Service()
        console = Console()
        
        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        if service_list:
            console.print(f"[blue]Restarting services:[/blue] {', '.join(service_list)}...")
        else:
            console.print("[blue]Restarting all services...[/blue]")
        
        with console.status("[bold blue]Restarting containers...[/bold blue]", spinner="dots"):
            err, msg = setup_obj.restart_services(service_list)
        
        if err is not None:
            raise click.ClickException(msg)
        console.print(f"[green]✅ {msg}[/green]")

    except FileNotFoundError as e:
        raise click.ClickException(str(e)) from e
    except RuntimeError as e:
        raise click.ClickException(str(e)) from e


@services.command()
@click.option('--services', '-s', 'service_names', help='Comma-separated list of services to remove')
@click.option('--volumes', '-v', is_flag=True, help='Remove volumes as well')
def remove(service_names, volumes):
    """Remove the platform services and optionally their volumes."""
    try:
        setup_obj = Service()
        console = Console()
        
        service_list = [s.strip() for s in service_names.split(',')] if service_names else None
        
        if service_list:
            console.print(f"[red]Removing services:[/red] {', '.join(service_list)}...")
        else:
            console.print("[red]Removing all services...[/red]")
        
        with console.status("[bold red]Removing containers...[/bold red]", spinner="dots"):
            err, msg = setup_obj.remove_services(service_list, remove_volumes=volumes)
        
        if err is not None:
            raise click.ClickException(msg)
        console.print(f"[green]✅ {msg}[/green]")

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
    console = Console()
    console.print("[bold cyan]Adding users from CSV file...[/bold cyan]")
    
    console.print("\n[cyan]Adding users to InfluxDB...[/cyan]")
    success, msg = influxdb.setup_influxdb_users()
    if not success:
        console.print(f"[red]InfluxDB: Failed {msg}[/red]", style="bold")
    else:
        console.print(f"[green]✅ InfluxDB: {msg}[/green]")

    console.print("\n[cyan]Adding users to RabbitMQ...[/cyan]")
    success, msg = rabbitmq.setup_rabbitmq_users()
    if not success:
        console.print(f"[red]RabbitMQ: Failed {msg}[/red]", style="bold")
    else:
        console.print(f"[green]✅ RabbitMQ: {msg}[/green]")

    console.print("\n[bold green]✅ Adding user completed![/bold green]")


if __name__ == "__main__":
    services()
