"""Tests for the formatter module"""

from io import StringIO

from rich.console import Console

from dtaas_services.pkg.formatter import (
    format_container_status,
    format_service_list_status,
)
from conftest import make_mock_container


def test_format_container_status_with_running_containers():
    """Test formatting running containers"""
    # Create mock containers
    container1 = make_mock_container("grafana", "running")
    container2 = make_mock_container("influxdb", "exited")
    containers = [container1, container2]
    # Capture console output
    string_io = StringIO()
    console = Console(file=string_io, force_terminal=True)
    format_container_status(containers, console)
    output = string_io.getvalue()
    # Check that service names appear
    assert "Grafana" in output or "grafana" in output
    assert "InfluxDB" in output or "influxdb" in output


def test_format_container_status_empty():
    """Test formatting with no containers"""
    containers = []
    string_io = StringIO()
    console = Console(file=string_io, force_terminal=True)
    format_container_status(containers, console)
    output = string_io.getvalue()
    assert "No services" in output


def test_format_service_list_status():
    """Test formatting service list with mixed statuses"""
    # Create mock container
    container = make_mock_container("grafana", "running")
    services = {"grafana": container, "influxdb": None}
    all_services = ["grafana", "influxdb"]
    string_io = StringIO()
    console = Console(file=string_io, force_terminal=True)
    format_service_list_status(services, all_services, console)
    output = string_io.getvalue()
    # Both services should appear
    assert "Grafana" in output or "grafana" in output
    assert "InfluxDB" in output or "influxdb" in output
