# pylint: disable=redefined-outer-name
"""Tests for Status methods (get_status, container matching, _fetch_status_data)"""

from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
import pytest
from dtaas_services.pkg.lib import Service


@pytest.fixture(autouse=True)
def patch_service_deps(monkeypatch):
    """Patch dependencies for Service tests"""
    monkeypatch.setenv("HOSTNAME", "test-hostname")
    with patch("dtaas_services.pkg.lib.initialization.Config") as mock_config, patch(
        "dtaas_services.pkg.lib.initialization.DockerClient"
    ) as mock_docker_client:
        mock_config_instance = Mock()
        mock_config_instance.env = {}
        mock_config.return_value = mock_config_instance
        yield mock_docker_client, mock_config


def test_get_status_success(patch_service_deps):
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
    with patch.object(Path, "exists", return_value=True):
        err, containers = service.get_status()
    assert err is None
    assert len(containers) == 2


def test_get_status_with_service_list(patch_service_deps):
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
    with patch.object(Path, "exists", return_value=True):
        err, containers = service.get_status(["grafana"])
    assert err is None
    assert any(c.name == "grafana" for c in containers)


def test_get_status_compose_file_not_found(patch_service_deps):
    """Test get_status when compose file does not exist"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, containers = service.get_status()
    assert err is not None
    assert isinstance(err, FileNotFoundError)
    assert containers == []


def test_get_status_docker_error(patch_service_deps):
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
    with patch.object(Path, "exists", return_value=True):
        err, containers = service.get_status()
    assert err is not None
    assert containers == []


def test_container_compose_service_label_no_label(patch_service_deps):
    """Test _container_compose_service_label when container has no label"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    mock_container = Mock()
    mock_container.config.labels = {}
    label = service._container_compose_service_label(mock_container)
    assert label is None


def test_match_container_by_label(patch_service_deps):
    """Test _match_container_by_label matches by service label"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    mock_container = Mock()
    mock_container.name = "container-123"
    mock_container.config.labels = {"com.docker.compose.service": "grafana"}
    container_map = {}
    all_services = {"grafana", "influxdb"}
    service._match_container_by_label(mock_container, container_map, all_services)
    assert "grafana" in container_map
    assert container_map["grafana"] == mock_container


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
