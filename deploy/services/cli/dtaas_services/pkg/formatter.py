"""Output formatting utilities using rich library"""

from typing import List, Union
from rich.console import Console
from rich.table import Table
from python_on_whales import Container
# pylint: disable=too-few-public-methods


class RemovedServiceEntry:
    """Placeholder class for removed services to show in status."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.state = type("obj", (object,), {"status": "removed"})


# Service name mapping for display
SERVICE_DISPLAY_NAMES = {
    "rabbitmq": "RabbitMQ",
    "mongodb": "MongoDB",
    "grafana": "Grafana",
    "influxdb": "InfluxDB",
    "postgres": "PostgreSQL",
    "thingsboard-ce": "ThingsBoard",
}

# User input to actual service name mapping
USER_TO_SERVICE_NAME = {
    "thingsboard": "thingsboard-ce",
    "postgresql": "postgres",
}

# Status emoji and text mapping
STATUS_INFO = {
    "running": ("✅", "running", "green"),
    "restarting": ("🔃", "restarting", "yellow"),
    "exited": ("🔴", "stopped", "red"),
    "removed": ("🗑️", "removed", "dim"),
}


def _get_display_name(service_name: str) -> str:
    """Get display name for a service."""
    return SERVICE_DISPLAY_NAMES.get(service_name, service_name.title())


def normalize_service_name(user_input: str) -> str:
    """Convert user input service name to actual compose service name.

    Args:
        user_input: Service name as typed by user (e.g., 'thingsboard')

    Returns:
        Actual service name in compose file (e.g., 'thingsboard-ce')
    """
    return USER_TO_SERVICE_NAME.get(user_input.lower(), user_input.lower())


def _format_status_display(state: str) -> str:
    """Format status with emoji and colored text."""
    emoji, status_text, color = STATUS_INFO.get(state, ("❓", state, "white"))
    return f"{emoji} [{color}]{status_text}[/{color}]"


def format_container_status(
    containers: List[Union[Container, RemovedServiceEntry]], console: Console = None
) -> None:
    """
    Format and display container status in a nice table.
    Args:
        containers: List of Container objects or RemovedServiceEntry objects from python_on_whales
        console: Optional Rich console instance (creates new one if not provided)
    """
    if console is None:
        console = Console()
    if not containers:
        console.print("[yellow]No services found[/yellow]")
        return
    # Rich auto-calculate width
    table = Table(show_header=True, header_style="bold magenta", padding=(0, 1))
    table.add_column("Service", style="cyan", no_wrap=True)
    table.add_column("Container Name", style="blue", no_wrap=True)
    table.add_column("Status", no_wrap=True)
    # Sort containers by name for consistent output
    sorted_containers = sorted(containers, key=lambda c: c.name)
    for container in sorted_containers:
        display_name = _get_display_name(container.name)
        container_name = container.name
        state = container.state.status
        status_display = _format_status_display(state)
        table.add_row(display_name, container_name, status_display)
    console.print(table)


def _sort_service_names(
    services: dict, all_services: List[str], table: Table
) -> List[str]:
    """Return a sorted list of service names."""
    sorted_services = sorted(all_services)
    for service_name in sorted_services:
        display_name = _get_display_name(service_name)
        container = services.get(service_name)
        if container is None:
            # Service not found/installed
            container_name = "-"
            status_display = "❌ [red]not installed[/red]"
        else:
            container_name = container.name
            state = container.state.status
            status_display = _format_status_display(state)
        table.add_row(display_name, container_name, status_display)


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
    table.add_column("Service", style="cyan", width=20)
    table.add_column("Container Name", style="blue", width=20)
    table.add_column("Status", width=25)
    # Sort services by name for consistent output
    _sort_service_names(services, all_services, table)
    console.print(table)
