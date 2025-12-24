"""Output formatting utilities using rich library"""
from typing import List
from rich.console import Console
from rich.table import Table
from python_on_whales import Container


# Service name mapping for display
SERVICE_DISPLAY_NAMES = {
    'rabbitmq': 'RabbitMQ',
    'mongodb': 'MongoDB',
    'grafana': 'Grafana',
    'influxdb': 'InfluxDB',
    'postgres': 'PostgreSQL'
}

# Status emoji and text mapping
STATUS_INFO = {
    'running': ('✅', 'running', 'green'),
    'restarting': ('🔃', 'restarting', 'yellow'),
    'paused': ('⏸️', 'paused', 'yellow'),
    'exited': ('🔴', 'stopped', 'red'),
    'dead': ('💀', 'dead', 'red'),
    'created': ('⚪', 'created', 'blue'),
}


def format_container_status(containers: List[Container], console: Console = None) -> None:
    """
    Format and display container status in a nice table.
    
    Args:
        containers: List of Container objects from python_on_whales
        console: Optional Rich console instance (creates new one if not provided)
    """
    if console is None:
        console = Console()
    
    if not containers:
        console.print("[yellow]No services are running[/yellow]")
        return
    
    # Create a table
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Service", style="cyan", width=15)
    table.add_column("Status", width=20)
    
    # Sort containers by name for consistent output
    sorted_containers = sorted(containers, key=lambda c: c.name)
    
    for container in sorted_containers:
        # Get display name
        service_name = container.name
        display_name = SERVICE_DISPLAY_NAMES.get(service_name, service_name.title())
        
        # Get container state
        state = container.state.status
        
        # Get status display info
        emoji, status_text, color = STATUS_INFO.get(state, ('❓', state, 'white'))
        
        # Format status with emoji and colored text
        status_display = f"{emoji} [{color}]{status_text}[/{color}]"
        
        table.add_row(display_name, status_display)
    
    console.print(table)


def format_service_list_status(services: dict, all_services: List[str], 
                               console: Console = None) -> None:
    """
    Format and display status of specific services, showing which are installed and their status.
    
    Args:
        services: Dictionary mapping service names to Container objects (or None if not found)
        all_services: List of all expected service names
        console: Optional Rich console instance (creates new one if not provided)
    """
    if console is None:
        console = Console()
    
    # Create a table
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Service", style="cyan", width=15)
    table.add_column("Status", width=20)
    
    # Sort services by name for consistent output
    sorted_services = sorted(all_services)
    
    for service_name in sorted_services:
        # Get display name
        display_name = SERVICE_DISPLAY_NAMES.get(service_name, service_name.title())
        
        container = services.get(service_name)
        
        if container is None:
            # Service not found/installed
            status_display = "❌ [red]not installed[/red]"
        else:
            # Get container state
            state = container.state.status
            
            # Get status display info
            emoji, status_text, color = STATUS_INFO.get(state, ('❓', state, 'white'))
            
            # Format status with emoji and colored text
            status_display = f"{emoji} [{color}]{status_text}[/{color}]"
        
        table.add_row(display_name, status_display)
    
    console.print(table)
