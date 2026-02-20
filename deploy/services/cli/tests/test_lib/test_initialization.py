"""Tests for Service initialization (ServiceInitializer)"""

from pathlib import Path
from unittest.mock import Mock
from dtaas_services.pkg.lib import Service
# pylint: disable=redefined-outer-name


def test_service_init_compose_file_is_path(patch_service_deps):
    """Test Service compose_file is a Path object"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/services")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    assert isinstance(service.compose_file, Path)
