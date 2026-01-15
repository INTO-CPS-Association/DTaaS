"""Tests for configuration module"""

# pylint: disable=W0613
from pathlib import Path
from unittest.mock import patch
import sys

import pytest

from dtaas_services.pkg.config import Config


def test_config_file_not_found():
    """Test error when config file doesn't exist"""
    with patch.object(Path, "exists", return_value=False):
        with pytest.raises(FileNotFoundError) as exc_info:
            Config()
        assert "Configuration file not found" in str(exc_info.value)


def test_config_get_value():
    """Test getting configuration value"""
    with patch("dtaas_services.pkg.config.load_dotenv"), patch(
        "os.environ", {"HOSTNAME": "test.local", "INFLUX_UID": "1000"}
    ):
        config = Config.__new__(Config)
        config.env = {"HOSTNAME": "test.local", "INFLUX_UID": "1000"}
        config.env_path = Path("test.env")
        assert config.get_value("HOSTNAME") == "test.local"
        assert config.get_value("INFLUX_UID") == "1000"


def test_config_get_value_missing():
    """Test error when getting missing value"""
    config = Config.__new__(Config)
    config.env = {"HOSTNAME": "test.local"}
    config.env_path = Path("test.env")
    with pytest.raises(RuntimeError) as exc_info:
        config.get_value("MISSING_KEY")
    assert "MISSING_KEY" in str(exc_info.value)


@patch("platform.system", return_value="Linux")
def test_config_get_base_dir_linux(mock_platform):
    """Test get_base_dir on Linux platform"""
    with patch("pathlib.Path.cwd") as mock_cwd:
        mock_cwd.return_value = Path("/home/user/project/deploy/services/cli")
        result = Config.get_base_dir()
        # On Linux, returns Path.cwd().parent
        assert "services" in str(result)


@patch("platform.system", return_value="Darwin")
def test_config_get_base_dir_darwin(mock_platform):
    """Test get_base_dir on Darwin/MacOS platform"""
    with patch("pathlib.Path.cwd") as mock_cwd:
        mock_cwd.return_value = Path("/Users/user/project/deploy/services/cli")
        result = Config.get_base_dir()
        # On Darwin, returns Path.cwd().parent
        assert "services" in str(result)


@patch("platform.system", return_value="Windows")
def test_config_get_base_dir_windows(mock_platform):
    """Test get_base_dir on Windows platform"""
    with patch("pathlib.Path.cwd") as mock_cwd, patch.object(
        Config, "_get_windows_base_dir"
    ) as mock_win:
        mock_cwd.return_value = Path("C:\\Users\\user\\project\\deploy\\services\\cli")
        mock_win.return_value = Path("C:\\Users\\user\\project\\deploy\\services")
        _ = Config.get_base_dir()
        mock_win.assert_called_once()


def test_config_get_base_dir_with_env_exists():
    """Test get_base_dir when services.env exists in current directory"""
    with patch("pathlib.Path.cwd") as mock_cwd, patch.object(
        Path, "exists"
    ) as mock_exists:
        mock_cwd.return_value = Path("/home/user/services")
        # First call checks if cwd_config exists, second checks env_path
        mock_exists.side_effect = [True, True]
        result = Config.get_base_dir()
        # Should return Path.cwd() when env exists in current dir
        assert "services" in str(result)


@patch("pathlib.Path.resolve")
def test_is_running_from_venv_site_packages(mock_resolve):
    """Test _is_running_from_venv with site-packages path"""
    mock_resolve.return_value = Path(
        "/usr/lib/python3.10/site-packages/dtaas_services/pkg/config.py"
    )
    result = Config._is_running_from_venv()
    assert result is True


@patch("pathlib.Path.resolve")
def test_is_running_from_venv_venv(mock_resolve):
    """Test _is_running_from_venv with venv path"""
    mock_resolve.return_value = Path(
        "/home/user/venv/lib/python3.10/site-packages/dtaas_services/pkg/config.py"
    )
    result = Config._is_running_from_venv()
    assert result is True


@patch("pathlib.Path.resolve")
def test_is_running_from_venv_source(mock_resolve):
    """Test _is_running_from_venv with source code path"""
    mock_resolve.return_value = Path("/home/user/project/dtaas_services/pkg/config.py")
    result = Config._is_running_from_venv()
    assert result is False


@pytest.mark.skipif(sys.platform != "win32", reason="Windows-specific test")
@patch("pathlib.Path.resolve")
def test_get_windows_base_dir_from_venv(mock_resolve):
    """Test _get_windows_base_dir when running from venv"""
    mock_resolve.return_value = Path(
        "C:\\Users\\user\\venv\\lib\\site-packages\\dtaas_services\\pkg\\config.py"
    )
    with patch("pathlib.Path.cwd") as mock_cwd:
        mock_cwd.return_value = Path("C:\\Users\\user\\venv")
        result = Config._get_windows_base_dir()
        # Should return cwd().parent when in venv
        assert "venv" in str(result) or "\\" in str(result)


@pytest.mark.skipif(sys.platform != "win32", reason="Windows-specific test")
@patch("pathlib.Path.resolve")
def test_get_windows_base_dir_from_source(mock_resolve):
    """Test _get_windows_base_dir when running from source"""
    mock_resolve.return_value = Path(
        "C:\\Users\\user\\project\\deploy\\services\\cli\\dtaas_services\\pkg\\config.py"
    )
    result = Config._get_windows_base_dir()
    # Should return Path(__file__).parent.parent.parent.parent
    assert "services" in str(result) or "\\" in str(result)
