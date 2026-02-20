"""Tests for service_ops commands (start, stop, restart, status, remove, clean)"""

from conftest import make_mock_container
from dtaas_services.cmd import services
# pylint: disable=W0621


def test_start_success(runner, mock_service_setup):
    """Test successful service start"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "Docker Compose started successfully",
    )
    result = runner.invoke(services, ["start"])
    assert result.exit_code == 0
    assert "Docker Compose started successfully" in result.output


def test_stop_success(runner, mock_service_setup):
    """Test successful service stop"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "Services stopped successfully",
    )
    result = runner.invoke(services, ["stop"])
    assert result.exit_code == 0
    assert "Services stopped successfully" in result.output


def test_status_success(runner, mock_service_setup):
    """Test successful status check with rich formatting"""
    mock_container1 = make_mock_container("grafana", "running")
    mock_container2 = make_mock_container("influxdb", "exited")
    mock_service_setup["service_instance"].get_status.return_value = (
        None,
        [mock_container1, mock_container2],
    )
    result = runner.invoke(services, ["status"])
    assert result.exit_code == 0
    assert "Grafana" in result.output or "grafana" in result.output


def test_status_failure(runner, mock_service_setup):
    """Test status command when it fails"""
    mock_service_setup["service_instance"].get_status.return_value = (
        FileNotFoundError("Compose file not found"),
        [],
    )
    result = runner.invoke(services, ["status"])
    assert result.exit_code != 0
    assert "Compose file not found" in result.output


def test_restart_success(runner, mock_service_setup):
    """Test successful service restart"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "Services restarted successfully",
    )
    result = runner.invoke(services, ["restart"])
    assert result.exit_code == 0
    assert "Services restarted successfully" in result.output


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


def test_status_runtime_error(runner, mock_service_setup):
    """Test status command raises RuntimeError"""
    mock_service_setup["service_instance"].get_status.side_effect = RuntimeError(
        "Docker not running"
    )
    result = runner.invoke(services, ["status"])
    assert result.exit_code != 0
    assert "Docker not running" in result.output


def test_status_file_not_found(runner, mocker):
    """Test status command when Service init raises FileNotFoundError"""
    mocker.patch(
        "dtaas_services.commands.service_ops.Service",
        side_effect=FileNotFoundError("Config not found"),
    )
    result = runner.invoke(services, ["status"])
    assert result.exit_code != 0
    assert "Config not found" in result.output


def test_remove_file_not_found(runner, mocker):
    """Test remove command when Service init raises FileNotFoundError"""
    mocker.patch(
        "dtaas_services.commands.service_ops.Service",
        side_effect=FileNotFoundError("Config not found"),
    )
    result = runner.invoke(services, ["remove"])
    assert result.exit_code != 0
    assert "Config not found" in result.output


def test_clean_success(runner, mock_service_setup):
    """Test successful clean command"""
    mock_service_setup["service_instance"].get_running_services.return_value = set()
    mock_service_setup["service_instance"].clean_services.return_value = (
        None,
        "Cleaned all service data",
    )
    result = runner.invoke(services, ["clean"], input="y\n")
    assert result.exit_code == 0
    assert "Cleaned" in result.output


def test_clean_aborted(runner):
    """Test clean command when user aborts confirmation"""
    result = runner.invoke(services, ["clean"], input="n\n")
    assert result.exit_code != 0


def test_clean_failure(runner, mock_service_setup):
    """Test clean command when clean_services fails"""
    mock_service_setup["service_instance"].get_running_services.return_value = set()
    mock_service_setup["service_instance"].clean_services.return_value = (
        RuntimeError("Disk error"),
        "Disk error",
    )
    result = runner.invoke(services, ["clean"], input="y\n")
    assert result.exit_code != 0


def test_clean_file_not_found(runner, mocker):
    """Test clean command when Service init raises FileNotFoundError"""
    mocker.patch(
        "dtaas_services.commands.service_ops.Service",
        side_effect=FileNotFoundError("Config not found"),
    )
    result = runner.invoke(services, ["clean"], input="y\n")
    assert result.exit_code != 0
    assert "Config not found" in result.output
