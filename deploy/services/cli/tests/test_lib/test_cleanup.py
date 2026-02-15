# pylint: disable=redefined-outer-name
"""Tests for Cleanup methods (remove_services, clean_services)"""

from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
import pytest
from dtaas_services.pkg.lib import Service


@pytest.fixture(autouse=True)
def patch_service_deps(monkeypatch):
    """Patch dependencies for Service tests"""
    monkeypatch.setenv("HOSTNAME", "test-hostname")
    with patch("dtaas_services.pkg.lib.initialization.Config") as mock_config, \
         patch("dtaas_services.pkg.lib.initialization.DockerClient") as mock_docker_client, \
         patch("dtaas_services.pkg.lib.cleanup.Config", mock_config), \
         patch("dtaas_services.pkg.lib.utils.Config", mock_config):
        mock_config_instance = Mock()
        mock_config_instance.env = {}
        mock_config.return_value = mock_config_instance
        yield mock_docker_client, mock_config


def _make_service(patch_service_deps, base_dir=None):
    """Helper to create a Service with mocked docker."""
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


def test_remove_services_with_volumes(patch_service_deps, tmp_path):
    """Test remove_services with volume removal"""
    service, mock_docker, mock_config = _make_service(patch_service_deps, tmp_path)
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.remove_services(remove_volumes=True)
    assert err is None
    mock_docker.compose.rm.assert_called_once()


def test_remove_services_with_service_list(patch_service_deps):
    """Test remove_services with specific services"""
    service, mock_docker, _ = _make_service(patch_service_deps)
    with patch.object(Path, "exists", return_value=True):
        err, _ = service.remove_services(["grafana", "influxdb"])
    assert err is None
    mock_docker.compose.rm.assert_called_once_with(
        ["grafana", "influxdb"], stop=True, volumes=False
    )


def test_remove_services_compose_file_not_found(patch_service_deps):
    """Test remove_services when compose file does not exist"""
    service, _, _ = _make_service(patch_service_deps, Path("/nonexistent/base"))
    with patch.object(Path, "exists", return_value=False):
        err, _ = service.remove_services()
    assert err is not None
    assert isinstance(err, FileNotFoundError)


def test_remove_services_docker_error(patch_service_deps):
    """Test remove_services with Docker error"""
    service, mock_docker, _ = _make_service(patch_service_deps)
    mock_docker.compose.rm.side_effect = OSError("Remove error")
    with patch.object(Path, "exists", return_value=True):
        err, message = service.remove_services()
    assert err is not None
    assert "remove error" in message.lower()


def test_remove_influx_config_no_file(patch_service_deps, tmp_path):
    """Test remove_influx_config when config file doesn't exist"""
    service, _, _ = _make_service(patch_service_deps, tmp_path)
    service.remove_influx_config(None)  # Should not raise


def test_get_directories_to_clean_with_certs(patch_service_deps, tmp_path):
    """Test _get_directories_to_clean with certificates"""
    service, _, _ = _make_service(patch_service_deps, tmp_path)
    (tmp_path / "data").mkdir()
    certs_dir = tmp_path / "certs" / "test-hostname"
    certs_dir.mkdir(parents=True)
    dirs = service._get_directories_to_clean(None, include_certs=True)
    assert certs_dir in dirs


def test_build_cleanup_message_all_services(patch_service_deps):
    """Test _build_cleanup_message for all services"""
    service, _, _ = _make_service(patch_service_deps)
    msg = service._build_cleanup_message(None, False)
    assert "all" in msg.lower()
    assert "certificates" not in msg.lower()


def test_validate_clean_directories_empty_with_service_list(patch_service_deps):
    """Test _validate_clean_directories with empty dirs and service list"""
    service, _, _ = _make_service(patch_service_deps)
    _, msg = service._validate_clean_directories([], ["grafana"])
    assert msg is not None
    assert "grafana" in msg


def test_clean_services_specific_services(patch_service_deps, tmp_path):
    """Test clean_services with specific service list"""
    service, _, _ = _make_service(patch_service_deps, tmp_path)
    (tmp_path / "data" / "grafana").mkdir(parents=True)
    (tmp_path / "data" / "grafana" / "file.txt").write_text("data")
    err, msg = service.clean_services(["grafana"])
    assert err is None
    assert "grafana" in msg


def test_clean_services_no_directories(patch_service_deps, tmp_path):
    """Test clean_services when no directories are found"""
    service, _, _ = _make_service(patch_service_deps, tmp_path)
    # No data or log dirs created
    _, msg = service.clean_services()
    assert msg is not None
    assert "no data directories" in msg.lower()


def test_clean_services_os_error(patch_service_deps, tmp_path):
    """Test clean_services handles OSError"""
    service, _, _ = _make_service(patch_service_deps, tmp_path)
    (tmp_path / "data").mkdir()
    with patch(
        "dtaas_services.pkg.lib.cleanup.remove_all_files_in_directory",
        side_effect=OSError("Disk error"),
    ):
        err, msg = service.clean_services()
    assert err is not None
    assert "failed" in msg.lower()
