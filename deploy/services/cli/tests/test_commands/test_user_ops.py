"""Tests for user_ops commands (user add, user reset-password)"""

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
def mock_user_pkg(mocker):
    """Mock user management modules - setup and reset functions"""
    mock_influx = mocker.patch("dtaas_services.commands.user_ops.influxdb")
    mock_rabbit = mocker.patch("dtaas_services.commands.user_ops.rabbitmq")
    mock_mongodb = mocker.patch("dtaas_services.commands.user_ops.setup_mongodb_users")
    mock_mongodb.return_value = (True, "Added")
    mock_postgres = mocker.patch(
        "dtaas_services.commands.user_ops.setup_postgres_users"
    )
    mock_postgres.return_value = (True, "Added")
    mock_thingsboard = mocker.patch(
        "dtaas_services.commands.user_ops.setup_thingsboard_users"
    )
    mock_gitlab = mocker.patch("dtaas_services.commands.user_ops.setup_gitlab_users")
    mock_reset_thingsboard = mocker.patch(
        "dtaas_services.commands.user_ops.reset_thingsboard_password"
    )
    mock_reset_gitlab = mocker.patch(
        "dtaas_services.commands.user_ops.reset_gitlab_password"
    )
    mock_thingsboard_running = mocker.patch(
        "dtaas_services.commands.user_ops.is_thingsboard_running",
        return_value=True,
    )
    mock_gitlab_running = mocker.patch(
        "dtaas_services.commands.user_ops.is_gitlab_running",
        return_value=True,
    )
    return {
        "influxdb": mock_influx,
        "rabbitmq": mock_rabbit,
        "mongodb": mock_mongodb,
        "postgres": mock_postgres,
        "thingsboard": mock_thingsboard,
        "gitlab": mock_gitlab,
        "reset_thingsboard": mock_reset_thingsboard,
        "reset_gitlab": mock_reset_gitlab,
        "thingsboard_running": mock_thingsboard_running,
        "gitlab_running": mock_gitlab_running,
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
    mock_user_pkg["mongodb"].return_value = (True, "Added to MongoDB")
    mock_user_pkg["thingsboard"].return_value = (
        True,
        "Added to ThingsBoard",
    )
    mock_user_pkg["gitlab"].return_value = (
        True,
        "Added to GitLab",
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
    mock_user_pkg["mongodb"].return_value = (False, "MongoDB failed")
    mock_user_pkg["thingsboard"].return_value = (
        False,
        "ThingsBoard failed",
    )
    mock_user_pkg["gitlab"].return_value = (
        False,
        "GitLab failed",
    )
    result = runner.invoke(services, ["user", "add"])
    assert result.exit_code == 0
    assert "InfluxDB: InfluxDB failed" in result.output
    assert "RabbitMQ: RabbitMQ failed" in result.output


def test_add_users_mixed_results(runner, mock_user_pkg):
    """Test when some services succeed and others fail"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (True, "Added")
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (
        False,
        "Connection refused",
    )
    mock_user_pkg["mongodb"].return_value = (True, "Added")
    mock_user_pkg["thingsboard"].return_value = (True, "Added")
    mock_user_pkg["gitlab"].return_value = (True, "Added")
    result = runner.invoke(services, ["user", "add"])
    assert result.exit_code == 0
    assert "with 1 error(s)" in result.output


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


def test_reset_password_thingsboard_success(runner, mock_user_pkg):
    """Test reset-password command succeeds for thingsboard"""
    mock_user_pkg["reset_thingsboard"].return_value = (
        True,
        "ThingsBoard sysadmin password updated successfully",
    )
    result = runner.invoke(services, ["user", "reset-password", "-s", "thingsboard"])
    assert result.exit_code == 0
    assert "ThingsBoard" in result.output


def test_reset_password_thingsboard_fails(runner, mock_user_pkg):
    """Test reset-password command when thingsboard password change fails"""
    mock_user_pkg["reset_thingsboard"].return_value = (False, "Auth failed")
    result = runner.invoke(services, ["user", "reset-password", "-s", "thingsboard"])
    assert result.exit_code == 0
    assert "ThingsBoard" in result.output


def test_reset_password_unknown_service(runner):
    """Test reset-password skips unknown services cleanly"""
    result = runner.invoke(services, ["user", "reset-password", "-s", "fakeservice"])
    assert result.exit_code == 0
    assert "not supported" in result.output


def test_reset_password_gitlab_success(runner, mock_user_pkg):
    """Test reset-password succeeds for GitLab"""
    mock_user_pkg["reset_gitlab"].return_value = (
        True,
        "GitLab root password updated successfully",
    )
    result = runner.invoke(services, ["user", "reset-password", "-s", "gitlab"])
    assert result.exit_code == 0
    assert "GitLab" in result.output
    mock_user_pkg["gitlab_running"].assert_called_once()
    mock_user_pkg["reset_gitlab"].assert_called_once()


def test_add_users_all_services_success(runner, mock_user_pkg):
    """Test user add with all services succeeding"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (True, "Added")
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (True, "Added")
    mock_user_pkg["mongodb"].return_value = (True, "Added")
    mock_user_pkg["thingsboard"].return_value = (True, "Added")
    mock_user_pkg["gitlab"].return_value = (True, "Added")
    result = runner.invoke(services, ["user", "add"])
    assert result.exit_code == 0
    assert "Users added successfully" in result.output
