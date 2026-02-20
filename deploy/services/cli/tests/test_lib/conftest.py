"""Shared fixtures for test_lib tests"""

from pathlib import Path
from unittest.mock import Mock, MagicMock
import pytest
from dtaas_services.pkg.lib import Service
# pylint: disable=W0621


@pytest.fixture(autouse=True)
def patch_service_deps(monkeypatch, mocker):
    """Patch dependencies for Service tests"""
    monkeypatch.setenv("HOSTNAME", "test-hostname")
    mock_config = mocker.patch("dtaas_services.pkg.lib.initialization.Config")
    mock_docker_client = mocker.patch(
        "dtaas_services.pkg.lib.initialization.DockerClient"
    )
    mocker.patch("dtaas_services.pkg.lib.cleanup.Config", mock_config)
    mocker.patch("dtaas_services.pkg.lib.utils.Config", mock_config)
    mock_config_instance = Mock()
    mock_config_instance.env = {}
    mock_config.return_value = mock_config_instance
    return mock_docker_client, mock_config


def _make_service(patch_service_deps, base_dir=None):
    """Helper to create a Service with mocked docker (MagicMock + compose config)."""
    mock_docker_client, mock_config = patch_service_deps
    if base_dir is None:
        base_dir = Path("/path/to/base")
    mock_config.get_base_dir.return_value = base_dir
    mock_docker = MagicMock()
    mock_config_obj = MagicMock()
    mock_config_obj.services = {"grafana": {}, "influxdb": {}}
    mock_docker.compose.config.return_value = mock_config_obj
    mock_docker_client.return_value = mock_docker
    return Service(), mock_docker, mock_config


def _make_simple_service(patch_service_deps, base_dir=None, use_magic_mock=False):
    """Helper to create a Service with a plain Mock docker (no compose config setup).

    Args:
        patch_service_deps: The patch_service_deps fixture value.
        base_dir: Optional base directory path; defaults to Path("/path/to/base").
        use_magic_mock: If True, use MagicMock instead of Mock for the docker client.
    """
    mock_docker_client, mock_config = patch_service_deps
    if base_dir is None:
        base_dir = Path("/path/to/base")
    mock_config.get_base_dir.return_value = base_dir
    mock_docker = MagicMock() if use_magic_mock else Mock()
    mock_docker_client.return_value = mock_docker
    return Service(), mock_docker, mock_config
