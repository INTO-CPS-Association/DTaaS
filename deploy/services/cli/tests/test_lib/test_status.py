"""Tests for Status methods (get_status, container matching, _fetch_status_data)"""

from pathlib import Path
from unittest.mock import Mock, MagicMock
from dtaas_services.pkg.lib import Service
from conftest import make_mock_container
from .conftest import _make_service, _make_simple_service
# pylint: disable=W0621, W0212


def test_get_status_success(patch_service_deps, mocker):
    """Test successful get_status"""

    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_container1 = Mock()
    mock_container1.name = "grafana"
    mock_container2 = Mock()
    mock_container2.name = "influxdb"
    mock_docker = MagicMock()
    mock_docker.container.list.return_value = [mock_container1, mock_container2]
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "influxdb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    service = Service()
    mocker.patch.object(Path, "exists", return_value=True)
    err, containers = service.get_status()
    assert err is None
    assert len(containers) == 2


def test_get_status_with_service_list(patch_service_deps, mocker):
    """Test get_status with specific services"""

    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_container = Mock()
    mock_container.name = "grafana"
    mock_docker = MagicMock()
    mock_docker.container.list.return_value = [mock_container]
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "mongodb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    service = Service()
    mocker.patch.object(Path, "exists", return_value=True)
    err, containers = service.get_status(["grafana"])
    assert err is None
    assert any(c.name == "grafana" for c in containers)


def test_get_status_compose_file_not_found(patch_service_deps, mocker):
    """Test get_status when compose file does not exist"""

    service, _, _ = _make_simple_service(
        patch_service_deps,
        base_dir=Path("/nonexistent/base"),
        use_magic_mock=True,
    )
    mocker.patch.object(Path, "exists", return_value=False)
    err, containers = service.get_status()
    assert err is not None
    assert isinstance(err, FileNotFoundError)
    assert containers == []


def test_get_status_docker_error(patch_service_deps, mocker):
    """Test get_status with Docker error"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.container.list.side_effect = OSError("Status error")
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "influxdb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    service = Service()
    mocker.patch.object(Path, "exists", return_value=True)
    err, containers = service.get_status()
    assert err is not None
    assert containers == []


def test_container_compose_service_label_no_label(patch_service_deps):
    """Test _container_compose_service_label when container has no label"""

    service, _, _ = _make_simple_service(patch_service_deps)
    mock_container = Mock()
    mock_container.config.labels = {}
    label = service._container_compose_service_label(mock_container)
    assert label is None


def test_fetch_status_data_get_service_names_error(patch_service_deps):
    """Test _fetch_status_data when get_all_service_names returns error"""

    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.config.side_effect = OSError("Config error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    err, result = service._fetch_status_data()
    assert err is not None
    assert result == []


def test_get_all_service_names_empty(patch_service_deps):
    """Test get_all_service_names with no services"""
    service, mock_docker, _ = _make_service(patch_service_deps)
    config_obj = MagicMock()
    config_obj.services = None
    mock_docker.compose.config.return_value = config_obj
    err, names = service.get_all_service_names()
    assert err is None
    assert names == set()


def test_get_running_services_returns_running(patch_service_deps, mocker):
    """Test get_running_services returns running service names"""

    service, mock_docker, _ = _make_service(patch_service_deps)
    container1 = make_mock_container("grafana", "running")
    container2 = make_mock_container("influxdb", "exited")
    mock_docker.container.list.return_value = [container1, container2]
    mocker.patch.object(Path, "exists", return_value=True)
    result = service.get_running_services()
    assert "grafana" in result
    assert "influxdb" not in result


def test_get_running_services_docker_error(patch_service_deps):
    """Test get_running_services returns empty set on docker error"""

    service, mock_docker, _ = _make_service(patch_service_deps)
    mock_docker.container.list.side_effect = OSError("Docker error")
    result = service.get_running_services()
    assert result == set()


def test_get_running_or_restarting_services(patch_service_deps, mocker):
    """Test get_running_or_restarting_services categorizes correctly"""

    service, mock_docker, _ = _make_service(patch_service_deps)
    container1 = make_mock_container("grafana", "running")
    container2 = make_mock_container("influxdb", "restarting")
    mock_docker.container.list.return_value = [container1, container2]
    mocker.patch.object(Path, "exists", return_value=True)
    running, restarting = service.get_running_or_restarting_services()
    assert "grafana" in running
    assert "influxdb" in restarting


def test_get_running_or_restarting_services_error(patch_service_deps):
    """Test get_running_or_restarting_services returns empty on error"""

    service, mock_docker, _ = _make_service(patch_service_deps)
    mock_docker.container.list.side_effect = OSError("Docker error")
    running, restarting = service.get_running_or_restarting_services()
    assert running == set()
    assert restarting == set()


def test_process_single_container_falls_back_to_label(patch_service_deps):
    """Test _process_single_container falls back to label matching"""

    service, _, _ = _make_service(patch_service_deps)
    container = Mock()
    container.name = "other-name"
    container.config.labels = {"com.docker.compose.service": "grafana"}
    container_map = {}
    service._process_single_container(container, container_map, {"grafana"})
    assert "grafana" in container_map
