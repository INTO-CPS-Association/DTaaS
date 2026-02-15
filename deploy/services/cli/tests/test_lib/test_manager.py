# pylint: disable=redefined-outer-name
"""Tests for Manager methods (manage_services: start, stop, restart)"""

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


def test_start_services_success(patch_service_deps):
    """Test successful start_services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")

    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True), patch.object(
        service, "get_running_services", return_value=set()
    ), patch.object(
        service, "get_all_service_names", return_value=(None, {"grafana", "influxdb"})
    ):
        err, message = service.manage_services("start")

    assert err is None
    assert "started" in message.lower()


def test_start_services_compose_file_not_found(patch_service_deps):
    """Test start_services when compose file does not exist"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.manage_services("start")

    assert err is not None
    assert isinstance(err, FileNotFoundError)


def test_start_services_docker_error(patch_service_deps):
    """Test start_services with Docker error"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.up.side_effect = OSError("Docker error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True), patch.object(
        service, "get_running_services", return_value=set()
    ), patch.object(service, "get_all_service_names", return_value=(None, {"grafana"})):
        err, message = service.manage_services("start")

    assert err is not None
    assert isinstance(err, OSError)
    assert "docker error" in message.lower()


def test_stop_services_success(patch_service_deps):
    """Test successful stop_services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.manage_services("stop")
    assert err is None
    assert "stopped" in message.lower()


def test_stop_services_with_service_list(patch_service_deps):
    """Test stop_services with specific services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.manage_services("stop", ["grafana", "influxdb"])
    assert err is None
    mock_docker.compose.stop.assert_called_once_with(["grafana", "influxdb"])


def test_stop_services_compose_file_not_found(patch_service_deps):
    """Test stop_services when compose file does not exist"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.manage_services("stop")
    assert err is not None
    assert isinstance(err, FileNotFoundError)


def test_stop_services_docker_error(patch_service_deps):
    """Test stop_services with Docker error"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.stop.side_effect = OSError("Docker stop error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.manage_services("stop")
    assert err is not None
    assert "docker stop error" in message.lower()


def test_restart_services_success(patch_service_deps):
    """Test successful restart_services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.manage_services("restart")
    assert err is None
    assert "restarted" in message.lower()
    mock_docker.compose.restart.assert_called_once()


def test_restart_services_with_service_list(patch_service_deps):
    """Test restart_services with specific services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.manage_services("restart", ["grafana"])
    assert err is None
    mock_docker.compose.restart.assert_called_once_with(["grafana"])


def test_restart_services_compose_file_not_found(patch_service_deps):
    """Test restart_services when compose file does not exist"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.manage_services("restart")
    assert err is not None
    assert isinstance(err, FileNotFoundError)


def test_restart_services_docker_error(patch_service_deps):
    """Test restart_services with Docker error"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.restart.side_effect = OSError("Restart error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.manage_services("restart")
    assert err is not None
    assert "restart error" in message.lower()
