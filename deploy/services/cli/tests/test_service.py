# pylint: disable=redefined-outer-name
"""Tests for Service class and Docker operations"""
import subprocess
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
import pytest
from dtaas_services.pkg.service import Service

# Patch Config and DockerClient for all tests in this module
@pytest.fixture(autouse=True)
def patch_service_deps(monkeypatch):
    """Patch dependencies for Service tests"""
    # Set HOSTNAME environment variable for Service class
    monkeypatch.setenv("HOSTNAME", "test-hostname")
    with patch("dtaas_services.pkg.service.Config") as mock_config, \
         patch("dtaas_services.pkg.service.DockerClient") as mock_docker_client:
        # Mock Config instance and its env attribute
        mock_config_instance = Mock()
        mock_config_instance.env = {}
        mock_config.return_value = mock_config_instance
        yield mock_docker_client, mock_config


def test_service_init(patch_service_deps):
    """Test Service initialization"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()

    assert "compose.services.secure.yml" in str(service.compose_file)
    assert service.docker == mock_docker


def test_service_init_compose_file_is_path(patch_service_deps):
    """Test Service compose_file is a Path object"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/services")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    assert isinstance(service.compose_file, Path)


def test_check_compose_file_exists(patch_service_deps):
    """Test _check_compose_file when file exists"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, exists = service._check_compose_file()
    assert err is None
    assert exists is True


def test_check_compose_file_not_exists(patch_service_deps):
    """Test _check_compose_file when file does not exist"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, exists = service._check_compose_file()
    assert err is not None
    assert isinstance(err, FileNotFoundError)
    assert exists is False


def test_handle_docker_error_subprocess(patch_service_deps):
    """Test _handle_docker_error with subprocess error"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = subprocess.CalledProcessError(1, "docker")
    err, message = service._handle_docker_error("test operation", exc)
    assert err is exc
    assert "test operation" in message


def test_handle_docker_error_os_error(patch_service_deps):
    """Test _handle_docker_error with OSError"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = OSError("Permission denied")
    err, message = service._handle_docker_error("test operation", exc)
    assert err is exc
    assert "test operation" in message
    assert "Permission denied" in message


def test_handle_docker_error_value_error(patch_service_deps):
    """Test _handle_docker_error with ValueError"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = ValueError("Invalid value")
    err, message = service._handle_docker_error("test operation", exc)
    assert err is exc
    assert "Invalid configuration" in message


def test_handle_docker_error_generic(patch_service_deps):
    """Test _handle_docker_error with generic exception"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = RuntimeError("Some runtime error")
    err, message = service._handle_docker_error("test operation", exc)
    assert err is exc
    assert "RuntimeError" in message
    assert "Some runtime error" in message


def test_start_services_success(patch_service_deps):
    """Test successful start_services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")

    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
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
    with patch.object(Path, "exists", return_value=True):
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
        err, _ = service.manage_services("stop", ['grafana', 'influxdb'])
    assert err is None
    mock_docker.compose.stop.assert_called_once_with(['grafana', 'influxdb'])


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
        err, _ = service.manage_services("restart", ['grafana'])
    assert err is None
    mock_docker.compose.restart.assert_called_once_with(['grafana'])


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


def test_get_status_success(patch_service_deps):
    """Test successful get_status"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_container1 = Mock()
    mock_container1.name = "grafana"
    mock_container2 = Mock()
    mock_container2.name = "influxdb"
    mock_docker = MagicMock()
    # Mock the container.list() call to return all containers
    mock_docker.container.list.return_value = [mock_container1, mock_container2]
    # Mock the config call to return services
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
    # Mock the container.list() call to return containers
    mock_docker.container.list.return_value = [mock_container]
    # Mock the config call to return services
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "mongodb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, containers = service.get_status(['grafana'])
    assert err is None
    # Should contain the grafana container
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
    # Mock container.list to raise an error
    mock_docker.container.list.side_effect = OSError("Status error")
    # Mock config to return services
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "influxdb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, containers = service.get_status()
    assert err is not None
    assert containers == []


def test_remove_services_success(patch_service_deps):
    """Test successful remove_services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.remove_services()
    assert err is None
    assert "removed" in message.lower()
    mock_docker.compose.down.assert_called_once()


def test_remove_services_with_volumes(patch_service_deps, tmp_path):
    """Test remove_services with volume removal"""
    mock_docker_client, mock_config = patch_service_deps
    base_dir = tmp_path / "base"
    base_dir.mkdir()
    mock_config.get_base_dir.return_value = base_dir
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.remove_services(remove_volumes=True)
    assert err is None
    mock_docker.compose.down.assert_called_once_with(volumes=True)
    # Check that data directories were recreated
    data_dir = base_dir / "data"
    assert (data_dir / "grafana").exists()
    assert (data_dir / "influxdb").exists()
    assert (data_dir / "mongodb").exists()


def test_remove_services_with_service_list(patch_service_deps):
    """Test remove_services with specific services"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.remove_services(['grafana', 'influxdb'])

    assert err is None
    mock_docker.compose.rm.assert_called_once_with(
        ['grafana', 'influxdb'], stop=True, volumes=False
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
    mock_docker.compose.down.side_effect = OSError("Remove error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.remove_services()
    assert err is not None
    assert "remove error" in message.lower()
