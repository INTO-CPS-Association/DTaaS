# pylint: disable=redefined-outer-name
"""Tests for lib/utils.py standalone utility functions"""

from pathlib import Path
from unittest.mock import patch, Mock
import pytest
from dtaas_services.pkg.lib import Service
from dtaas_services.pkg.lib.utils import (
    check_compose_file,
    get_service_data_directories,
)


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


def test_check_compose_file_exists(patch_service_deps):
    """Test check_compose_file when file exists"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, exists = check_compose_file(service.compose_file)
    assert err is None
    assert exists is True


def test_check_compose_file_not_exists(patch_service_deps):
    """Test check_compose_file when file does not exist"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=False):
        err, exists = check_compose_file(service.compose_file)
    assert err is not None
    assert isinstance(err, FileNotFoundError)
    assert exists is False


def test_get_service_data_directories_with_custom_list(patch_service_deps, tmp_path):
    """Test get_service_data_directories with custom service list"""
    mock_docker_client, mock_config = patch_service_deps
    base_dir = tmp_path / "base"
    base_dir.mkdir()
    # Create data subdirectories for the services
    (base_dir / "data" / "grafana").mkdir(parents=True)
    (base_dir / "data" / "influxdb").mkdir(parents=True)
    mock_config.get_base_dir.return_value = base_dir
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    custom_list = ["grafana", "influxdb"]
    result = get_service_data_directories(custom_list)
    assert len(result) == 2
    assert all(isinstance(p, Path) for p in result)
