"""Tests for service_ops commands (start, stop, restart, status, remove, clean)"""

import json
import pytest
from conftest import make_mock_container
from dtaas_services.cmd import services
from dtaas_services.pkg.formatter import RemovedServiceEntry
# pylint: disable=W0621


@pytest.mark.parametrize(
    "verb, message",
    [
        ("start", "Docker Compose started successfully"),
        ("stop", "Services stopped successfully"),
        ("restart", "Services restarted successfully"),
    ],
)
def test_lifecycle_success(runner, mock_service_setup, verb, message):
    """Test successful service start, stop and restart"""
    instance = mock_service_setup["service_instance"]
    instance.manage_services.return_value = (None, message)
    result = runner.invoke(services, ["service", verb, "-s", "grafana, influxdb"])
    assert result.exit_code == 0
    assert message in result.output
    instance.manage_services.assert_called_once_with(verb, ["grafana", "influxdb"])


def test_status_success(runner, mock_service_setup):
    """Test successful status check with rich formatting"""
    mock_container1 = make_mock_container("grafana", "running")
    mock_container2 = make_mock_container("influxdb", "exited")
    mock_service_setup["service_instance"].get_status.return_value = (
        None,
        [mock_container1, mock_container2],
    )
    result = runner.invoke(services, ["service", "status"])
    assert result.exit_code == 0
    assert "Grafana" in result.output or "grafana" in result.output


def test_status_json(runner, mock_service_setup):
    """Test status --json prints one machine readable object per container"""
    instance = mock_service_setup["service_instance"]
    instance.get_status.return_value = (
        None,
        [make_mock_container("gitlab", "running", "starting"), RemovedServiceEntry("grafana")],
    )
    result = runner.invoke(services, ["service", "status", "--json", "-s", "gitlab,grafana"])
    assert result.exit_code == 0
    assert json.loads(result.stdout) == [
        {"service": "gitlab", "container": "gitlab", "status": "starting"},
        {"service": "grafana", "container": "grafana", "status": "removed"},
    ]
    instance.get_status.assert_called_once_with(["gitlab", "grafana"])


def test_status_json_drops_blank_selector_elements(runner, mock_service_setup):
    """A trailing comma does not reach the status lookup as an empty name"""
    instance = mock_service_setup["service_instance"]
    instance.get_status.return_value = (None, [])
    result = runner.invoke(services, ["service", "status", "-s", "gitlab, ,"])
    assert result.exit_code == 0
    instance.get_status.assert_called_once_with(["gitlab"])


@pytest.mark.parametrize(
    "error",
    [FileNotFoundError("Compose file not found"), RuntimeError("Docker not running")],
)
def test_status_errors(runner, mock_service_setup, error):
    """Test status command when get_status reports or raises an error"""
    instance = mock_service_setup["service_instance"]
    if isinstance(error, RuntimeError):
        instance.get_status.side_effect = error
    else:
        instance.get_status.return_value = (error, [])
    result = runner.invoke(services, ["service", "status"])
    assert result.exit_code != 0
    assert str(error) in result.output


@pytest.mark.parametrize(
    "flags, expected_volumes",
    [([], False), (["--volumes"], True), (["-v"], True)],
)
def test_remove_volumes_flag(runner, mock_service_setup, flags, expected_volumes):
    """Test remove passes --volumes and its -v alias through"""
    instance = mock_service_setup["service_instance"]
    instance.remove_services.return_value = (None, "Services removed")
    result = runner.invoke(
        services, ["service", "remove", "--services", "grafana,influxdb"] + flags
    )
    assert result.exit_code == 0
    instance.remove_services.assert_called_once_with(
        ["grafana", "influxdb"], remove_volumes=expected_volumes
    )


def test_remove_failure(runner, mock_service_setup):
    """Test remove failure"""
    mock_service_setup["service_instance"].remove_services.return_value = (
        FileNotFoundError("File not found"),
        "File not found",
    )
    result = runner.invoke(services, ["service", "remove"])
    assert result.exit_code != 0


@pytest.mark.parametrize("verb", ["status", "remove", "clean"])
def test_service_init_file_not_found(runner, mocker, verb):
    """Test commands when Service init raises FileNotFoundError"""
    mocker.patch(
        "dtaas_services.commands.service_ops.Service",
        side_effect=FileNotFoundError("Config not found"),
    )
    result = runner.invoke(services, ["service", verb], input="y\n")
    assert result.exit_code != 0
    assert "Config not found" in result.output


@pytest.mark.parametrize(
    "clean_result, succeeds",
    [
        ((None, "Cleaned all service data"), True),
        ((RuntimeError("Disk error"), "Disk error"), False),
    ],
)
def test_clean_result(runner, mock_service_setup, clean_result, succeeds):
    """Test clean command success and failure"""
    mock_service_setup["service_instance"].clean_services.return_value = clean_result
    result = runner.invoke(services, ["service", "clean"], input="y\n")
    assert (result.exit_code == 0) is succeeds
    assert clean_result[1] in result.output


def test_clean_aborted(runner):
    """Test clean command when user aborts confirmation"""
    result = runner.invoke(services, ["service", "clean"], input="n\n")
    assert result.exit_code != 0


def test_clean_running_services_hint(runner, mock_service_setup):
    """Test clean refuses running services and hints the new stop spelling"""
    mock_service_setup["service_instance"].get_running_services.return_value = {"grafana"}
    result = runner.invoke(services, ["service", "clean", "-s", "grafana"], input="y\n")
    assert result.exit_code != 0
    assert "dtaas-services service stop -s grafana" in result.output
