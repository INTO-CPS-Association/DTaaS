# pylint: disable=redefined-outer-name
"""Tests for Service initialization (ServiceInitializer)"""

from pathlib import Path
from unittest.mock import patch, Mock
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


def test_service_init_compose_file_is_path(patch_service_deps):
    """Test Service compose_file is a Path object"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/services")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    assert isinstance(service.compose_file, Path)
