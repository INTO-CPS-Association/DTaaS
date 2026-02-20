"""Tests for DockerExecutor methods"""

import subprocess
from pathlib import Path
from python_on_whales.exceptions import DockerException
from .conftest import _make_simple_service
# pylint: disable=W0621, W0212


def test_handle_docker_error_subprocess(patch_service_deps):
    """Test handle_docker_error with subprocess error"""
    service, _, _ = _make_simple_service(patch_service_deps)
    exc = subprocess.CalledProcessError(1, "docker")
    err, message = service.handle_docker_error("test operation", exc)
    assert err is exc
    assert "test operation" in message


def test_handle_docker_error_value_error(patch_service_deps):
    """Test handle_docker_error with ValueError"""
    service, _, _ = _make_simple_service(patch_service_deps)
    exc = ValueError("Invalid value")
    err, message = service.handle_docker_error("test operation", exc)
    assert err is exc
    assert "Invalid configuration" in message


def test_handle_docker_error_generic(patch_service_deps):
    """Test handle_docker_error with generic exception"""
    service, _, _ = _make_simple_service(patch_service_deps)
    exc = RuntimeError("Some runtime error")
    err, message = service.handle_docker_error("test operation", exc)
    assert err is exc
    assert "RuntimeError" in message
    assert "Some runtime error" in message


def test_execute_compose_action_invalid_action(patch_service_deps, mocker):
    """Test _execute_compose_action with invalid action raises ValueError"""
    service, _, _ = _make_simple_service(patch_service_deps, use_magic_mock=True)
    mocker.patch.object(Path, "exists", return_value=True)
    err, _ = service.manage_services("invalid_action")
    assert err is not None
    assert isinstance(err, ValueError)
    assert "Invalid action" in str(err)


def test_process_docker_exception_service_not_found(patch_service_deps, mocker):
    """Test _process_docker_exception with service not found error"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    exc = DockerException(["docker"], 1, None, None)
    exc.args = ("no such service: unknown_service",)
    mock_docker.compose.up.side_effect = exc
    mocker.patch.object(Path, "exists", return_value=True)
    mocker.patch.object(
        service, "get_running_or_restarting_services", return_value=(set(), set())
    )
    mocker.patch.object(
        service, "prepare_services_to_start", return_value=(["unknown_service"], [], [])
    )
    err, _ = service.manage_services("start", ["unknown_service"])
    assert err is not None
    assert isinstance(err, ValueError)
    assert "Service not found" in str(err)


def test_process_docker_exception_generic_docker_error(patch_service_deps, mocker):
    """Test _process_docker_exception with generic docker error"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    exc = DockerException(["docker"], 1, None, None)
    exc.args = ("Some other docker error occurred",)
    mock_docker.compose.up.side_effect = exc
    mocker.patch.object(Path, "exists", return_value=True)
    mocker.patch.object(service, "get_running_services", return_value=set())
    mocker.patch.object(
        service, "get_all_service_names", return_value=(None, {"grafana"})
    )
    err, _ = service.manage_services("start")
    assert err is not None
    assert isinstance(err, RuntimeError)
    assert "Docker error" in str(err)


def test_execute_compose_action_start_returns_tuple(patch_service_deps, mocker):
    """Test _execute_compose_action returns tuple for start action"""
    service, _, _ = _make_simple_service(patch_service_deps, use_magic_mock=True)
    mocker.patch.object(Path, "exists", return_value=True)
    mocker.patch.object(
        service, "get_running_or_restarting_services", return_value=(set(), set())
    )
    mocker.patch.object(
        service, "prepare_all_services_to_start", return_value=(["grafana"], [], [])
    )
    skipped, started, restarting = service._execute_compose_action("start", None)
    assert isinstance(skipped, list)
    assert isinstance(started, list)
    assert isinstance(restarting, list)


def test_stop_services_with_service_list(patch_service_deps):
    """Test _stop_services with specific service list"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    service._stop_services(["grafana", "influxdb"])
    mock_docker.compose.stop.assert_called_once_with(["grafana", "influxdb"])


def test_stop_services_without_service_list(patch_service_deps):
    """Test _stop_services without service list (stops all)"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    service._stop_services(None)
    mock_docker.compose.stop.assert_called_once_with()


def test_restart_services_with_service_list(patch_service_deps):
    """Test _restart_services with specific service list"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    service._restart_services(["grafana", "influxdb"])
    mock_docker.compose.restart.assert_called_once_with(["grafana", "influxdb"])


def test_restart_services_without_service_list(patch_service_deps):
    """Test _restart_services without service list (restarts all)"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    service._restart_services(None)
    mock_docker.compose.restart.assert_called_once_with()


def test_get_services_to_remove_with_service_list(patch_service_deps):
    """Test _get_services_to_remove with specific service list"""
    service, _, _ = _make_simple_service(patch_service_deps, use_magic_mock=True)
    result = service._get_services_to_remove(["grafana", "influxdb"])
    assert result == ["grafana", "influxdb"]


def test_get_services_to_remove_without_service_list(patch_service_deps, mocker):
    """Test _get_services_to_remove without service list (gets all)"""
    service, _, _ = _make_simple_service(patch_service_deps, use_magic_mock=True)
    mocker.patch.object(
        service, "get_all_service_names", return_value=(None, {"grafana", "influxdb"})
    )
    result = service._get_services_to_remove(None)
    assert set(result) == {"grafana", "influxdb"}


def test_perform_post_removal_cleanup_with_volumes(patch_service_deps, mocker):
    """Test _perform_post_removal_cleanup when remove_volumes is True"""
    service, _, _ = _make_simple_service(patch_service_deps, use_magic_mock=True)
    mock_clean = mocker.patch.object(service, "clean_data_directories")
    mock_remove_influx = mocker.patch.object(service, "remove_influx_config")
    service._perform_post_removal_cleanup(["grafana"], True)
    mock_clean.assert_called_once_with(["grafana"])
    mock_remove_influx.assert_called_once_with(["grafana"])


def test_remove_docker_services_with_services(patch_service_deps, mocker):
    """Test remove_docker_services when services exist"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    mocker.patch.object(
        service, "_get_services_to_remove", return_value=["grafana", "influxdb"]
    )
    mocker.patch.object(service, "_perform_post_removal_cleanup")
    service.remove_docker_services(["grafana", "influxdb"], False)
    mock_docker.compose.rm.assert_called_once_with(
        ["grafana", "influxdb"], stop=True, volumes=False
    )


def test_is_docker_daemon_error_with_daemon_keyword(patch_service_deps, mocker):
    """Test DockerException with 'daemon' keyword triggers daemon error"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    exc = DockerException(["docker"], 1, None, None)
    exc.args = ("Error: Cannot connect to the Docker daemon",)
    mock_docker.compose.up.side_effect = exc
    mocker.patch.object(Path, "exists", return_value=True)
    mocker.patch.object(
        service, "get_running_or_restarting_services", return_value=(set(), set())
    )
    mocker.patch.object(
        service, "prepare_all_services_to_start", return_value=(["grafana"], [], [])
    )
    err, _ = service.manage_services("start")
    assert err is not None
    assert isinstance(err, RuntimeError)
    assert "Docker is not running" in str(err)
