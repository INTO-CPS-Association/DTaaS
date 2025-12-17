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
