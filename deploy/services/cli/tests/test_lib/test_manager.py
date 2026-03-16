"""Tests for Manager methods (manage_services: start, stop, restart)"""

from pathlib import Path
from unittest.mock import Mock
from dtaas_services.pkg.lib.manager import ServiceActionResult
from .conftest import (
    _make_service,
    _make_simple_service,
    _setup_service_with_compose_not_found,
)
# pylint: disable=W0621, W0212


def test_start_services_compose_file_not_found(patch_service_deps, mocker):
    """Test start_services when compose file does not exist"""
    service = _setup_service_with_compose_not_found(patch_service_deps, mocker)
    err, _ = service.manage_services("start")

    assert err is not None
    assert isinstance(err, FileNotFoundError)


def test_start_services_docker_error(patch_service_deps, mocker):
    """Test start_services with Docker error"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    mock_docker.compose.up.side_effect = OSError("Docker error")
    mocker.patch.object(Path, "exists", return_value=True)
    mocker.patch.object(service, "get_running_services", return_value=set())
    mocker.patch.object(
        service, "get_all_service_names", return_value=(None, {"grafana"})
    )
    err, message = service.manage_services("start")

    assert err is not None
    assert isinstance(err, OSError)
    assert "docker error" in message.lower()


def test_stop_services_with_service_list(patch_service_deps, mocker):
    """Test stop_services with specific services"""
    service, mock_docker, _ = _make_simple_service(
        patch_service_deps, use_magic_mock=True
    )
    mocker.patch.object(Path, "exists", return_value=True)
    err, _ = service.manage_services("stop", ["grafana", "influxdb"])
    assert err is None
    mock_docker.compose.stop.assert_called_once_with(["grafana", "influxdb"])


def test_prepare_services_to_start(patch_service_deps, mocker):
    """Test prepare_services_to_start separates running/starting/restarting"""
    service, mock_docker, _ = _make_service(patch_service_deps)
    container_running = Mock()
    container_running.name = "grafana"
    container_running.state.status = "running"
    container_restarting = Mock()
    container_restarting.name = "influxdb"
    container_restarting.state.status = "restarting"
    mock_docker.container.list.return_value = [container_running, container_restarting]

    mocker.patch.object(Path, "exists", return_value=True)
    _, skipped, restarting = service.prepare_services_to_start(
        ["grafana", "influxdb", "mongodb"], skip_services=set()
    )
    assert "grafana" in skipped
    assert "influxdb" in restarting


def test_prepare_all_services_to_start_error(patch_service_deps):
    """Test prepare_all_services_to_start when get_all_service_names fails"""
    service, mock_docker, _ = _make_service(patch_service_deps)
    mock_docker.compose.config.side_effect = OSError("Config error")
    to_start, skipped, restarting = service.prepare_all_services_to_start(
        skip_services=set()
    )
    assert to_start == []
    assert not skipped
    assert not restarting


def test_filter_postgres_if_needed_stop_postgres_tb_running(patch_service_deps, mocker):
    """Test _filter_postgres_if_needed blocks postgres stop when TB is running"""
    service, _, _ = _make_service(patch_service_deps)
    mocker.patch(
        "dtaas_services.pkg.lib.manager._is_thingsboard_container_running",
        return_value=True,
    )
    _, err, msg = service._filter_postgres_if_needed("stop", ["postgres"])
    assert err is not None
    assert msg is not None
    assert "thingsboard" in msg.lower()


def test_filter_postgres_if_needed_stop_postgres_tb_not_running(
    patch_service_deps, mocker
):
    """Test _filter_postgres_if_needed allows postgres stop when TB is not running"""
    service, _, _ = _make_service(patch_service_deps)
    mocker.patch(
        "dtaas_services.pkg.lib.manager._is_thingsboard_container_running",
        return_value=False,
    )
    _, err, _ = service._filter_postgres_if_needed("stop", ["postgres"])
    assert err is None


def test_get_success_message_start_with_skipped(patch_service_deps):
    """Test _get_success_message for start with skipped services"""

    service, _, _ = _make_service(patch_service_deps)
    result = ServiceActionResult(
        skipped=["grafana"], affected=["influxdb"], restarting=[]
    )
    msg = service._get_success_message("start", result)
    assert "skipped" in msg.lower()
    assert "started" in msg.lower()


def test_get_success_message_start_with_restarting(patch_service_deps):
    """Test _get_success_message for start with restarting services"""

    service, _, _ = _make_service(patch_service_deps)
    result = ServiceActionResult(skipped=[], affected=[], restarting=["grafana"])
    msg = service._get_success_message("start", result)
    assert "restarting" in msg.lower()


def test_build_started_message_no_services_to_start(patch_service_deps):
    """Test _build_started_message when nothing to start"""
    service, _, _ = _make_service(patch_service_deps)
    msg = service._build_started_message([], [], [])
    assert msg is not None
    assert "no services" in msg.lower()


def test_handle_service_action_error_value_error(patch_service_deps):
    """Test _handle_service_action_error with ValueError"""
    service, _, _ = _make_service(patch_service_deps)
    err, msg = service._handle_service_action_error("stop", ValueError("test error"))
    assert isinstance(err, ValueError)
    assert "test error" in msg
