"""Tests for Service class and Docker operations"""
import pytest
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock, PropertyMock
from dtaas_services.pkg.service import Service


class TestServiceInit:
    """Tests for Service initialization"""

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_service_init(self, mock_docker_client, mock_config):
        """Test Service initialization"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = Mock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        # Verify the path structure
        assert "compose.services.secure.yml" in str(service.compose_file)
        assert service.docker == mock_docker

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_service_init_compose_file_is_path(self, mock_docker_client, mock_config):
        """Test Service compose_file is a Path object"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/services")
        
        mock_docker = Mock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        assert isinstance(service.compose_file, Path)


class TestServiceStartServices:
    """Tests for Service.start_services method"""

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_start_services_success(self, mock_docker_client, mock_config):
        """Test successful start_services"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        # Mock the compose_file.exists() method
        with patch.object(Path, "exists", return_value=True):
            err, message = service.start_services()
        
        assert err is None
        assert "started" in message.lower()

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_start_services_compose_file_not_found(self, mock_docker_client, mock_config):
        """Test start_services when compose file does not exist"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/nonexistent/base")
        
        mock_docker = MagicMock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        # Mock the compose_file.exists() method to return False
        with patch.object(Path, "exists", return_value=False):
            err, message = service.start_services()
        
        assert err is not None
        assert isinstance(err, FileNotFoundError)

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_start_services_docker_error(self, mock_docker_client, mock_config):
        """Test start_services with Docker error"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_docker.compose.up.side_effect = Exception("Docker error")
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=True):
            err, message = service.start_services()
        
        assert err is not None
        assert isinstance(err, Exception)
        assert "docker error" in message.lower()


class TestServiceStopServices:
    """Tests for Service.stop_services method"""

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_stop_services_success(self, mock_docker_client, mock_config):
        """Test successful stop_services"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=True):
            err, message = service.stop_services()
        
        assert err is None
        assert "stopped" in message.lower()

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_stop_services_compose_file_not_found(self, mock_docker_client, mock_config):
        """Test stop_services when compose file does not exist"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/nonexistent/base")
        
        mock_docker = MagicMock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=False):
            err, _ = service.stop_services()
        
        assert err is not None
        assert isinstance(err, FileNotFoundError)

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_stop_services_docker_error(self, mock_docker_client, mock_config):
        """Test stop_services with Docker error"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_docker.compose.down.side_effect = Exception("Docker error")
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=True):
            err, message = service.stop_services()
        
        assert err is not None
        assert isinstance(err, Exception)
        assert "docker error" in message.lower()


class TestServiceRestartServices:
    """Tests for Service.restart_services method"""

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_restart_services_success(self, mock_docker_client, mock_config):
        """Test successful restart_services"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=True):
            err, message = service.restart_services()
        
        assert err is None
        assert "restarted" in message.lower()

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_restart_services_compose_file_not_found(self, mock_docker_client, mock_config):
        """Test restart_services when compose file does not exist"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/nonexistent/base")
        
        mock_docker = MagicMock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=False):
            err, _ = service.restart_services()
        
        assert err is not None
        assert isinstance(err, FileNotFoundError)

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_restart_services_docker_error(self, mock_docker_client, mock_config):
        """Test restart_services with Docker error"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_docker.compose.restart.side_effect = Exception("Docker error")
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=True):
            err, message = service.restart_services()
        
        assert err is not None
        assert isinstance(err, Exception)
        assert "docker error" in message.lower()


class TestServiceGetStatus:
    """Tests for Service.get_status method"""

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_get_status_success(self, mock_docker_client, mock_config):
        """Test successful get_status"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_containers = [Mock(name="mongo", state=Mock(status="running")),
                          Mock(name="influx", state=Mock(status="running"))]
        mock_docker.containers.list.return_value = mock_containers
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=True):
            err, status = service.get_status()
        
        assert err is None
        assert isinstance(status, str)

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_get_status_compose_file_not_found(self, mock_docker_client, mock_config):
        """Test get_status when compose file does not exist"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/nonexistent/base")
        
        mock_docker = MagicMock()
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=False):
            err, _ = service.get_status()
        
        assert err is not None
        assert isinstance(err, FileNotFoundError)

    @patch("dtaas_services.pkg.service.Config")
    @patch("dtaas_services.pkg.service.DockerClient")
    def test_get_status_docker_error(self, mock_docker_client, mock_config):
        """Test get_status with Docker error"""
        mock_config_instance = Mock()
        mock_config.return_value = mock_config_instance
        mock_config.get_base_dir.return_value = Path("/path/to/base")
        
        mock_docker = MagicMock()
        mock_docker.compose.ps.side_effect = Exception("Docker error")
        mock_docker_client.return_value = mock_docker
        
        service = Service(config=mock_config_instance)
        
        with patch.object(Path, "exists", return_value=True):
            err, message = service.get_status()
        
        assert err is not None
        assert isinstance(err, Exception)
        assert "docker error" in message.lower()
