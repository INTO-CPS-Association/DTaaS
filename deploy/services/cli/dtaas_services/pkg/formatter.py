"""Output formatting utilities using rich library"""

from typing import List, Union
from rich.console import Console
from rich.table import Table
from python_on_whales import Container


class RemovedService:
    """Placeholder class for removed services to show in status."""
    def __init__(self, name: str) -> None:
        self.name = name
        self.state = type('obj', (object,), {'status': 'removed'})


# Service name mapping for display
SERVICE_DISPLAY_NAMES = {
    "rabbitmq": "RabbitMQ",
    "mongodb": "MongoDB",
    "grafana": "Grafana",
    "influxdb": "InfluxDB",
    "postgres": "PostgreSQL",
}

# Status emoji and text mapping
STATUS_INFO = {
    "running": ("✅", "running", "green"),
    "restarting": ("🔃", "restarting", "yellow"),
    "paused": ("⏸️", "paused", "yellow"),
    "exited": ("🔴", "stopped", "red"),
    "dead": ("💀", "dead", "red"),
    "created": ("⚪", "created", "blue"),
    "removed": ("🗑️", "removed", "dim"),
}


def _get_display_name(service_name: str) -> str:
    """Get display name for a service."""
    return SERVICE_DISPLAY_NAMES.get(service_name, service_name.title())


def _format_status_display(state: str) -> str:
    """Format status with emoji and colored text."""
    emoji, status_text, color = STATUS_INFO.get(state, ("❓", state, "white"))
    return f"{emoji} [{color}]{status_text}[/{color}]"


def format_container_status(
    containers: List[Union[Container, RemovedService]], console: Console = None
) -> None:
    """
    Format and display container status in a nice table.
    Args:
        containers: List of Container objects or RemovedService objects from python_on_whales
        console: Optional Rich console instance (creates new one if not provided)
    """
    if console is None:
        console = Console()
    if not containers:
        console.print("[yellow]No services found[/yellow]")
        return
    # Create a table
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Service", style="cyan", width=15)
    table.add_column("Status", width=20)
    # Sort containers by name for consistent output
    sorted_containers = sorted(containers, key=lambda c: c.name)
    for container in sorted_containers:
        display_name = _get_display_name(container.name)
        state = container.state.status
        status_display = _format_status_display(state)
        table.add_row(display_name, status_display)
    console.print(table)


def _sort_service_names(services: dict, all_services: List[str], table: Table) -> List[str]:
    """Return a sorted list of service names."""
    sorted_services = sorted(all_services)
    for service_name in sorted_services:
        display_name = _get_display_name(service_name)
        container = services.get(service_name)
        if container is None:
            # Service not found/installed
            status_display = "❌ [red]not installed[/red]"
        else:
            state = container.state.status
            status_display = _format_status_display(state)
        table.add_row(display_name, status_display)


def format_service_list_status(
    services: dict, all_services: List[str], console: Console = None
) -> None:
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
    _sort_service_names(services, all_services, table)
    console.print(table)
