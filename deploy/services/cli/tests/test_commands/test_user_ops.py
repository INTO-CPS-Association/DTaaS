"""Tests for user_ops commands (user add)"""

from unittest.mock import patch
import pytest
from click.testing import CliRunner
from rich.console import Console
from dtaas_services.cmd import services
from dtaas_services.commands.user_ops import (
    _print_service_user_result,
    _setup_specific_service,
    UserSetupResult,
)
# pylint: disable=W0621


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_user_pkg():
    """Mock user management modules"""
    with patch("dtaas_services.commands.user_ops.influxdb") as mock_influx, patch(
        "dtaas_services.commands.user_ops.rabbitmq"
    ) as mock_rabbit, patch(
        "dtaas_services.commands.user_ops.setup_thingsboard_users"
    ) as mock_thingsboard:
        yield {
            "influxdb": mock_influx,
            "rabbitmq": mock_rabbit,
            "thingsboard": mock_thingsboard,
        }


def test_add_users_influxdb_fails(runner, mock_user_pkg):
    """Test when InfluxDB addition fails"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (
        False,
        "InfluxDB error",
    )
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (
        True,
        "Added to RabbitMQ",
    )
    mock_user_pkg["thingsboard"].return_value = (
        True,
        "Added to ThingsBoard",
    )
    result = runner.invoke(services, ["user", "add"])
    assert result.exit_code == 0
    assert "InfluxDB: InfluxDB error" in result.output
    assert "RabbitMQ: Added to RabbitMQ" in result.output


def test_add_users_both_fail(runner, mock_user_pkg):
    """Test when both services fail"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (
        False,
        "InfluxDB failed",
    )
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (
        False,
        "RabbitMQ failed",
    )
    mock_user_pkg["thingsboard"].return_value = (
        False,
        "ThingsBoard failed",
    )
    result = runner.invoke(services, ["user", "add"])
    assert result.exit_code == 0
    assert "InfluxDB: InfluxDB failed" in result.output
    assert "RabbitMQ: RabbitMQ failed" in result.output


def test_print_service_user_result_not_installed():
    """Test _print_service_user_result for 'not installed' message"""

    console = Console()
    result = UserSetupResult("ThingsBoard", True, "Service not installed")
    _print_service_user_result(console, result)


def test_setup_specific_service_unknown():
    """Test _setup_specific_service with unknown service"""

    console = Console()
    result = _setup_specific_service(console, "unknown_service")
    assert result is None


def test_add_users_specific_service(runner, mock_user_pkg):
    """Test user add with specific service"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (True, "OK")
    result = runner.invoke(services, ["user", "add", "-s", "influxdb"])
    assert result.exit_code == 0
    assert "InfluxDB: OK" in result.output
