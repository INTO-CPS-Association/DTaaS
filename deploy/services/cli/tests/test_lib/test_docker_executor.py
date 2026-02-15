# pylint: disable=redefined-outer-name
"""Tests for DockerExecutor methods"""

import subprocess
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
import pytest
from dtaas_services.pkg.lib import Service
from python_on_whales.exceptions import DockerException


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


def test_handle_docker_error_subprocess(patch_service_deps):
    """Test handle_docker_error with subprocess error"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = subprocess.CalledProcessError(1, "docker")
    err, message = service.handle_docker_error("test operation", exc)
    assert err is exc
    assert "test operation" in message


def test_handle_docker_error_os_error(patch_service_deps):
    """Test handle_docker_error with OSError"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = OSError("Permission denied")
    err, message = service.handle_docker_error("test operation", exc)
    assert err is exc
    assert "test operation" in message
    assert "Permission denied" in message


def test_handle_docker_error_value_error(patch_service_deps):
    """Test handle_docker_error with ValueError"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = ValueError("Invalid value")
    err, message = service.handle_docker_error("test operation", exc)
    assert err is exc
    assert "Invalid configuration" in message


def test_handle_docker_error_generic(patch_service_deps):
    """Test handle_docker_error with generic exception"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = Mock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    exc = RuntimeError("Some runtime error")
    err, message = service.handle_docker_error("test operation", exc)
    assert err is exc
    assert "RuntimeError" in message
    assert "Some runtime error" in message


def test_docker_not_running_decorator(patch_service_deps):
    """Test handle_docker_not_running decorator catches DockerException"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker.compose.up.side_effect = DockerException(["docker"], 1, None, None)
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True), patch.object(
        service, "get_running_services", return_value=set()
    ), patch.object(service, "get_all_service_names", return_value=(None, {"grafana"})):
        err, _ = service.manage_services("start")
    assert err is not None
    assert isinstance(err, RuntimeError)
    assert "Docker is not running" in str(err)


def test_execute_compose_action_invalid_action(patch_service_deps):
    """Test _execute_compose_action with invalid action raises ValueError"""
    mock_docker_client, mock_config = patch_service_deps
    mock_config.get_base_dir.return_value = Path("/path/to/base")
    mock_docker = MagicMock()
    mock_docker_client.return_value = mock_docker
    service = Service()
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.manage_services("invalid_action")
    assert err is not None
    assert isinstance(err, ValueError)
    assert "Invalid action" in str(err)
