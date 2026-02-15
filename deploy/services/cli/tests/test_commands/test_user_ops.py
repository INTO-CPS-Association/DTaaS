"""Tests for user_ops commands (user add)"""

# pylint: disable=redefined-outer-name
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from dtaas_services.cmd import services


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


def test_user_help(runner):
    """Test user command shows help"""
    result = runner.invoke(services, ["user", "--help"])
    assert result.exit_code == 0
    assert "User account management" in result.output


def test_add_users_success(runner, mock_user_pkg):
    """Test successful user addition"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (
        True,
        "Added to InfluxDB",
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
    assert "Adding users from CSV file" in result.output
    assert "InfluxDB: Added to InfluxDB" in result.output
    assert "RabbitMQ: Added to RabbitMQ" in result.output


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
