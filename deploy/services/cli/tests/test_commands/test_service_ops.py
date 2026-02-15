"""Tests for service_ops commands (start, stop, restart, status, remove)"""

# pylint: disable=redefined-outer-name
from unittest.mock import Mock

from dtaas_services.cmd import services


def test_start_success(runner, mock_service_setup):
    """Test successful service start"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "Docker Compose started successfully",
    )
    result = runner.invoke(services, ["start"])
    assert result.exit_code == 0
    assert "Docker Compose started successfully" in result.output


def test_start_failure(runner, mock_service_setup):
    """Test service start failure"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        FileNotFoundError("Docker not found"),
        "Docker not found",
    )
    result = runner.invoke(services, ["start"])
    assert result.exit_code != 0
    assert "Docker not found" in result.output


def test_stop_success(runner, mock_service_setup):
    """Test successful service stop"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "Services stopped successfully",
    )
    result = runner.invoke(services, ["stop"])
    assert result.exit_code == 0
    assert "Services stopped successfully" in result.output


def test_stop_failure(runner, mock_service_setup):
    """Test service stop failure"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        Exception("Stop failed"),
        "Stop failed",
    )
    result = runner.invoke(services, ["stop"])
    assert result.exit_code != 0


def test_status_success(runner, mock_service_setup):
    """Test successful status check with rich formatting"""
    mock_container1 = Mock()
    mock_container1.name = "grafana"
    mock_container1.state.status = "running"
    mock_container2 = Mock()
    mock_container2.name = "influxdb"
    mock_container2.state.status = "exited"
    mock_service_setup["service_instance"].get_status.return_value = (
        None,
        [mock_container1, mock_container2],
    )
    result = runner.invoke(services, ["status"])
    assert result.exit_code == 0
    assert "Grafana" in result.output or "grafana" in result.output


def test_status_no_services(runner, mock_service_setup):
    """Test status when no services are running"""
    mock_service_setup["service_instance"].get_status.return_value = (None, [])
    result = runner.invoke(services, ["status"])
    assert result.exit_code == 0
    assert "No services" in result.output or "running" in result.output


def test_status_failure(runner, mock_service_setup):
    """Test status command when it fails"""
    mock_service_setup["service_instance"].get_status.return_value = (
        FileNotFoundError("Compose file not found"),
        [],
    )
    result = runner.invoke(services, ["status"])
    assert result.exit_code != 0
    assert "Compose file not found" in result.output


def test_status_with_service_filter(runner, mock_service_setup):
    """Test status command with specific services"""
    mock_container = Mock()
    mock_container.name = "grafana"
    mock_container.state.status = "running"
    mock_service_setup["service_instance"].get_status.return_value = (
        None,
        [mock_container],
    )
    result = runner.invoke(services, ["status", "--services", "grafana,influxdb"])
    assert result.exit_code == 0


def test_restart_success(runner, mock_service_setup):
    """Test successful service restart"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "Services restarted successfully",
    )
    result = runner.invoke(services, ["restart"])
    assert result.exit_code == 0
    assert "Services restarted successfully" in result.output


def test_restart_specific_services(runner, mock_service_setup):
    """Test restart with specific services"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "Services restarted successfully",
    )
    result = runner.invoke(services, ["restart", "--services", "grafana"])
    assert result.exit_code == 0


def test_restart_failure(runner, mock_service_setup):
    """Test restart failure"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        RuntimeError("Restart failed"),
        "Restart failed",
    )
    result = runner.invoke(services, ["restart"])
    assert result.exit_code != 0
    assert "Restart failed" in result.output


def test_remove_success(runner, mock_service_setup):
    """Test successful service removal"""
    mock_service_setup["service_instance"].remove_services.return_value = (
        None,
        "Services removed",
    )
    result = runner.invoke(services, ["remove"])
    assert result.exit_code == 0
    assert "Services removed" in result.output


def test_remove_with_volumes(runner, mock_service_setup):
    """Test service removal with volumes"""
    remove_return = (None, "Services and volumes removed")
    mock_service_setup["service_instance"].remove_services.return_value = remove_return
    result = runner.invoke(services, ["remove", "--volumes"])
    assert result.exit_code == 0
    mock_service_setup["service_instance"].remove_services.assert_called_once()


def test_remove_specific_services(runner, mock_service_setup):
    """Test removing specific services"""
    mock_service_setup["service_instance"].remove_services.return_value = (
        None,
        "Services removed",
    )
    result = runner.invoke(services, ["remove", "--services", "grafana,influxdb"])
    assert result.exit_code == 0


def test_remove_failure(runner, mock_service_setup):
    """Test remove failure"""
    mock_service_setup["service_instance"].remove_services.return_value = (
        FileNotFoundError("File not found"),
        "File not found",
    )
    result = runner.invoke(services, ["remove"])
    assert result.exit_code != 0
