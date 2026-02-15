# pylint: disable=redefined-outer-name
"""Tests for Cleanup methods (remove_services)"""

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


def test_remove_services_success(patch_service_deps):
    """Test successful remove_services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "influxdb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.remove_services()
    assert err is None
    assert "removed" in message.lower()
    mock_docker.compose.rm.assert_called_once()


def test_remove_services_with_volumes(patch_service_deps, tmp_path):
    """Test remove_services with volume removal"""
    mock_docker_client, mock_config = patch_service_deps
    base_dir = tmp_path / "base"
    base_dir.mkdir()
    mock_config.get_base_dir.return_value = base_dir
    mock_docker = MagicMock()
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "influxdb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.remove_services(remove_volumes=True)
    assert err is None
    mock_docker.compose.rm.assert_called_once()


def test_remove_services_with_service_list(patch_service_deps):
    """Test remove_services with specific services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.remove_services(["grafana", "influxdb"])

    assert err is None
    mock_docker.compose.rm.assert_called_once_with(
        ["grafana", "influxdb"], stop=True, volumes=False
    )


def test_remove_services_compose_file_not_found(patch_service_deps):
    """Test remove_services when compose file does not exist"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.remove_services()
    assert err is not None
    assert isinstance(err, FileNotFoundError)


def test_remove_services_docker_error(patch_service_deps):
    """Test remove_services with Docker error"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker.compose.rm.side_effect = OSError("Remove error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.remove_services()
    assert err is not None
    assert "remove error" in message.lower()
