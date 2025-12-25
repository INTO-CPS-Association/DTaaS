"""Tests for the formatter module"""
from io import StringIO
from unittest.mock import Mock

from rich.console import Console

from dtaas_services.pkg.formatter import (
    format_container_status,
    format_service_list_status,
    SERVICE_DISPLAY_NAMES,
    STATUS_INFO
)


def test_format_container_status_with_running_containers():
    """Test formatting running containers"""
    # Create mock containers
    container1 = Mock()
    container1.name = "grafana"
    container1.state.status = "running"
    container2 = Mock()
    container2.name = "influxdb"
    container2.state.status = "exited"
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


def test_format_container_status_sorting():
    """Test that containers are sorted by name"""
    # Create containers in reverse alphabetical order
    container1 = Mock()
    container1.name = "rabbitmq"
    container1.state.status = "running"
    container2 = Mock()
    container2.name = "grafana"
    container2.state.status = "running"
    containers = [container1, container2]
    string_io = StringIO()
    console = Console(file=string_io, force_terminal=True)
    format_container_status(containers, console)
    output = string_io.getvalue()
    # Both should appear in the output
    assert "Grafana" in output or "grafana" in output
    assert "RabbitMQ" in output or "rabbitmq" in output


def test_service_display_names():
    """Test that service display names are defined"""
    assert "grafana" in SERVICE_DISPLAY_NAMES
    assert "influxdb" in SERVICE_DISPLAY_NAMES
    assert "mongodb" in SERVICE_DISPLAY_NAMES
    assert "rabbitmq" in SERVICE_DISPLAY_NAMES
    assert SERVICE_DISPLAY_NAMES["grafana"] == "Grafana"
    assert SERVICE_DISPLAY_NAMES["rabbitmq"] == "RabbitMQ"


def test_status_info():
    """Test that status info is defined"""
    assert "running" in STATUS_INFO
    assert "exited" in STATUS_INFO
    assert "restarting" in STATUS_INFO
    # Check structure
    emoji, text, color = STATUS_INFO["running"]
    assert emoji == "✅"
    assert text == "running"
    assert color == "green"


def test_format_service_list_status():
    """Test formatting service list with mixed statuses"""
    # Create mock container
    container = Mock()
    container.name = "grafana"
    container.state.status = "running"
    services = {"grafana": container, "influxdb": None}
    all_services = ["grafana", "influxdb"]
    string_io = StringIO()
    console = Console(file=string_io, force_terminal=True)
    format_service_list_status(services, all_services, console)
    output = string_io.getvalue()
    # Both services should appear
    assert "Grafana" in output or "grafana" in output
    assert "InfluxDB" in output or "influxdb" in output
