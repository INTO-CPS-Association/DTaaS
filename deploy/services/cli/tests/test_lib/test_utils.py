"""Tests for lib/utils.py standalone utility functions"""

from pathlib import Path
from dtaas_services.pkg.lib.utils import (
    check_compose_file,
    get_service_data_directories,
    try_remove_file,
    remove_all_files_in_directory,
    remove_gitkeep_files,
    get_certs_directory,
    get_data_subdirectories,
    _remove_directory_item,
    _process_directory_contents,
    _process_gitkeep_item,
    _process_gitkeep_directory,
)
from .conftest import _make_simple_service
# pylint: disable=W0621

DATA_SUBDIRECTORIES = 7


def test_check_compose_file_exists(patch_service_deps, mocker):
    """Test check_compose_file when file exists"""
    service, _, _ = _make_simple_service(patch_service_deps)
    mocker.patch.object(Path, "exists", return_value=True)
    err, exists = check_compose_file(service.compose_file)
    assert err is None
    assert exists is True


def test_check_compose_file_not_exists(patch_service_deps, mocker):
    """Test check_compose_file when file does not exist"""
    service, _, _ = _make_simple_service(patch_service_deps)
    mocker.patch.object(Path, "exists", return_value=False)
    err, exists = check_compose_file(service.compose_file)
    assert err is not None
    assert isinstance(err, FileNotFoundError)
    assert exists is False


def test_get_service_data_directories_with_custom_list(patch_service_deps, tmp_path):
    """Test get_service_data_directories with custom service list"""
    _, mock_config = patch_service_deps
    base_dir = tmp_path / "base"
    base_dir.mkdir()
    # Create data subdirectories for the services
    (base_dir / "data" / "grafana").mkdir(parents=True)
    (base_dir / "data" / "influxdb").mkdir(parents=True)
    mock_config.get_base_dir.return_value = base_dir
    custom_list = ["grafana", "influxdb"]
    result = get_service_data_directories(custom_list)
    assert len(result) == 2
    assert all(isinstance(p, Path) for p in result)


def test_try_remove_file_nonexistent(tmp_path):
    """Test try_remove_file handles non-existent file gracefully"""
    test_file = tmp_path / "nonexistent.txt"
    try_remove_file(test_file)  # Should not raise


def test_remove_directory_item_directory(tmp_path):
    """Test _remove_directory_item removes a directory"""
    test_dir = tmp_path / "subdir"
    test_dir.mkdir()
    (test_dir / "file.txt").write_text("content")
    _remove_directory_item(test_dir)
    assert not test_dir.exists()


def test_process_directory_contents_permission_error(tmp_path, mocker):
    """Test _process_directory_contents handles access errors"""
    mocker.patch.object(Path, "iterdir", side_effect=OSError("Permission denied"))
    _process_directory_contents(tmp_path)


def test_remove_all_files_in_directory_nonexistent(tmp_path):
    """Test remove_all_files_in_directory with non-existent directory"""
    nonexistent = tmp_path / "nonexistent"
    remove_all_files_in_directory(nonexistent)  # Should not raise


def test_process_gitkeep_item_directory(tmp_path):
    """Test _process_gitkeep_item recurses into directories"""
    sub = tmp_path / "sub"
    sub.mkdir()
    gitkeep = sub / ".gitkeep"
    gitkeep.write_text("")
    _process_gitkeep_item(sub)
    assert not gitkeep.exists()


def test_process_gitkeep_directory_error(tmp_path, mocker):
    """Test _process_gitkeep_directory handles access errors"""
    mocker.patch.object(Path, "iterdir", side_effect=OSError("Access denied"))
    _process_gitkeep_directory(tmp_path)


def test_remove_gitkeep_files_nonexistent(tmp_path):
    """Test remove_gitkeep_files with non-existent directory"""
    nonexistent = tmp_path / "nonexistent"
    remove_gitkeep_files(nonexistent)  # Should not raise


def test_get_service_data_directories_none(patch_service_deps, tmp_path):
    """Test get_service_data_directories with None returns root directories"""
    _, mock_config = patch_service_deps
    base_dir = tmp_path / "base"
    base_dir.mkdir()
    (base_dir / "data").mkdir()
    (base_dir / "log").mkdir()
    mock_config.get_base_dir.return_value = base_dir
    result = get_service_data_directories(None)
    assert len(result) == 2


def test_get_certs_directory_exists(patch_service_deps, tmp_path):
    """Test get_certs_directory returns path when certs directory exists"""
    _, mock_config = patch_service_deps
    base_dir = tmp_path / "base"
    base_dir.mkdir()
    certs_dir = base_dir / "certs"
    certs_dir.mkdir(parents=True)
    mock_config.get_base_dir.return_value = base_dir
    result = get_certs_directory()
    assert result == certs_dir


def test_get_certs_directory_not_exists(patch_service_deps, tmp_path):
    """Test get_certs_directory returns None when certs dir doesn't exist"""
    _, mock_config = patch_service_deps
    base_dir = tmp_path / "base"
    base_dir.mkdir()
    mock_config.get_base_dir.return_value = base_dir
    result = get_certs_directory()
    assert result is None


def test_get_data_subdirectories_with_list():
    """Test get_data_subdirectories returns the service list"""
    result = get_data_subdirectories(["grafana", "influxdb"])
    assert result == ["grafana", "influxdb"]


def test_get_data_subdirectories_none():
    """Test get_data_subdirectories returns default list when None"""
    result = get_data_subdirectories(None)
    assert "grafana" in result
    assert "influxdb" in result
    assert "gitlab" in result
    assert len(result) == DATA_SUBDIRECTORIES
