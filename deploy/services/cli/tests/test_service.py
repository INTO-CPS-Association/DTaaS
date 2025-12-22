"""Tests for Service class and Docker operations"""
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
from dtaas_services.pkg.service import Service


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_service_init(mock_docker_client, mock_config):
    """Test Service initialization"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    assert "compose.services.secure.yml" in str(service.compose_file)
    assert service.docker == mock_docker


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_service_init_compose_file_is_path(mock_docker_client, mock_config):
    """Test Service compose_file is a Path object"""
    mock_config.get_base_dir.return_value = Path("/services")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    assert isinstance(service.compose_file, Path)


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_start_services_success(mock_docker_client, mock_config):
    """Test successful start_services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.start_services()
    
    assert err is None
    assert "started" in message.lower()


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_start_services_compose_file_not_found(mock_docker_client, mock_config):
    """Test start_services when compose file does not exist"""
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.start_services()
    
    assert err is not None
    assert isinstance(err, FileNotFoundError)


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_start_services_docker_error(mock_docker_client, mock_config):
    """Test start_services with Docker error"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.up.side_effect = Exception("Docker error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, message = service.start_services()
    
    assert err is not None
    assert isinstance(err, Exception)
    assert "docker error" in message.lower()


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_stop_services_success(mock_docker_client, mock_config):
    """Test successful stop_services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, message = service.stop_services()
    
    assert err is None
    assert "stopped" in message.lower()


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_stop_services_with_service_list(mock_docker_client, mock_config):
    """Test stop_services with specific services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.stop_services(['grafana', 'influxdb'])
    
    assert err is None
    mock_docker.compose.stop.assert_called_once_with(['grafana', 'influxdb'])


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_stop_services_compose_file_not_found(mock_docker_client, mock_config):
    """Test stop_services when compose file does not exist"""
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.stop_services()
    
    assert err is not None
    assert isinstance(err, FileNotFoundError)


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_stop_services_docker_error(mock_docker_client, mock_config):
    """Test stop_services with Docker error"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.down.side_effect = Exception("Docker stop error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, message = service.stop_services()
    
    assert err is not None
    assert "docker stop error" in message.lower()


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_restart_services_success(mock_docker_client, mock_config):
    """Test successful restart_services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, message = service.restart_services()
    
    assert err is None
    assert "restarted" in message.lower()
    mock_docker.compose.restart.assert_called_once()


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_restart_services_with_service_list(mock_docker_client, mock_config):
    """Test restart_services with specific services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.restart_services(['grafana'])
    
    assert err is None
    mock_docker.compose.restart.assert_called_once_with(['grafana'])


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_restart_services_compose_file_not_found(mock_docker_client, mock_config):
    """Test restart_services when compose file does not exist"""
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.restart_services()
    
    assert err is not None
    assert isinstance(err, FileNotFoundError)


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_restart_services_docker_error(mock_docker_client, mock_config):
    """Test restart_services with Docker error"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.restart.side_effect = Exception("Restart error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, message = service.restart_services()
    
    assert err is not None
    assert "restart error" in message.lower()


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_get_status_success(mock_docker_client, mock_config):
    """Test successful get_status"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_container1 = Mock()
    mock_container1.name = "grafana"
    mock_container2 = Mock()
    mock_container2.name = "influxdb"
    
    mock_docker = MagicMock()
    mock_docker.compose.ps.return_value = [mock_container1, mock_container2]
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, containers = service.get_status()
    
    assert err is None
    assert len(containers) == 2


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_get_status_with_service_list(mock_docker_client, mock_config):
    """Test get_status with specific services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_container = Mock()
    mock_docker = MagicMock()
    mock_docker.compose.ps.return_value = [mock_container]
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.get_status(['grafana'])
    
    assert err is None
    mock_docker.compose.ps.assert_called_once_with(['grafana'])


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_get_status_compose_file_not_found(mock_docker_client, mock_config):
    """Test get_status when compose file does not exist"""
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=False):
        err, containers = service.get_status()
    
    assert err is not None
    assert isinstance(err, FileNotFoundError)
    assert containers == []


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_get_status_docker_error(mock_docker_client, mock_config):
    """Test get_status with Docker error"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.ps.side_effect = Exception("Status error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, containers = service.get_status()
    
    assert err is not None
    assert containers == []


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_remove_services_success(mock_docker_client, mock_config):
    """Test successful remove_services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, message = service.remove_services()
    
    assert err is None
    assert "removed" in message.lower()
    mock_docker.compose.down.assert_called_once()


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_remove_services_with_volumes(mock_docker_client, mock_config, tmp_path):
    """Test remove_services with volume removal"""
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


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_remove_services_with_service_list(mock_docker_client, mock_config):
    """Test remove_services with specific services"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.remove_services(['grafana', 'influxdb'])
    
    assert err is None
    mock_docker.compose.rm.assert_called_once_with(['grafana', 'influxdb'], stop=True, volumes=False)


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_remove_services_compose_file_not_found(mock_docker_client, mock_config):
    """Test remove_services when compose file does not exist"""
    mock_config.get_base_dir.return_value = Path("/nonexistent/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.remove_services()
    
    assert err is not None
    assert isinstance(err, FileNotFoundError)


@patch("dtaas_services.pkg.service.Config")
@patch("dtaas_services.pkg.service.DockerClient")
def test_remove_services_docker_error(mock_docker_client, mock_config):
    """Test remove_services with Docker error"""
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.down.side_effect = Exception("Remove error")
    mock_docker_client.return_value = mock_docker
    service = Service()
    
    with patch.object(Path, "exists", return_value=True):
        err, message = service.remove_services()
    
    assert err is not None
    assert "remove error" in message.lower()
