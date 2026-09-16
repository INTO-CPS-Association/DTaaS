"""Tests for the formatter module"""

from io import StringIO
from typing import cast, List, Union

from rich.console import Console
from python_on_whales import Container

from dtaas_services.pkg.formatter import (
    build_status_json,
    format_container_status,
    format_service_list_status,
    RemovedServiceEntry,
)
from conftest import make_mock_container


def test_format_container_status_with_running_containers():
    """Test formatting running containers"""
    # Create mock containers
    container1 = make_mock_container("grafana", "running")
    container2 = make_mock_container("influxdb", "exited")
    containers = cast(
        List[Union[Container, RemovedServiceEntry]], [container1, container2]
    )
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


def test_format_container_status_starting():
    """Test formatting containers with health status 'starting'"""
    container = make_mock_container("gitlab", "running", health_status="starting")
    containers = cast(List[Union[Container, RemovedServiceEntry]], [container])
    string_io = StringIO()
    console = Console(file=string_io, force_terminal=True)
    format_container_status(containers, console)
    output = string_io.getvalue()
    assert "starting" in output


def test_format_container_status_unhealthy():
    """Test formatting containers with health status 'unhealthy'"""
    container = make_mock_container("gitlab", "running", health_status="unhealthy")
    containers = cast(List[Union[Container, RemovedServiceEntry]], [container])
    string_io = StringIO()
    console = Console(file=string_io, force_terminal=True)
    format_container_status(containers, console)
    output = string_io.getvalue()
    assert "not ready" in output


def test_build_status_json_uses_compose_service_label():
    """Service names come from the compose label, so thingsboard maps to thingsboard-ce"""
    container = make_mock_container("thingsboard", "exited")
    container.config.labels = {"com.docker.compose.service": "thingsboard-ce"}
    containers = cast(
        List[Union[Container, RemovedServiceEntry]],
        [container, RemovedServiceEntry("postgres")],
    )
    assert build_status_json(containers) == [
        {"service": "postgres", "container": "postgres", "status": "removed"},
        {
            "service": "thingsboard-ce",
            "container": "thingsboard",
            "status": "exited",
        },
    ]


def test_build_status_json_keeps_replicas_of_one_service():
    """Containers sharing a compose service label each get their own entry"""
    replicas = []
    for name in ("gitlab-1", "gitlab-2"):
        container = make_mock_container(name, "running")
        container.config.labels = {"com.docker.compose.service": "gitlab"}
        replicas.append(container)
    containers = cast(List[Union[Container, RemovedServiceEntry]], replicas)
    entries = build_status_json(containers)
    assert [entry["container"] for entry in entries] == ["gitlab-1", "gitlab-2"]
    assert {entry["service"] for entry in entries} == {"gitlab"}


def test_build_status_json_empty():
    """No containers gives an empty object"""
    assert not build_status_json([])
