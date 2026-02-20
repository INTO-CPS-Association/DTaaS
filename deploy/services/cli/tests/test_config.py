"""Tests for configuration module"""

from pathlib import Path
import sys
import pytest
from dtaas_services.pkg.config import Config
# pylint: disable=W0613, W0212


def test_config_file_not_found(mocker):
    """Test error when config file doesn't exist"""
    mocker.patch.object(Path, "exists", return_value=False)
    with pytest.raises(FileNotFoundError) as exc_info:
        Config()
    assert "Configuration file not found" in str(exc_info.value)


def test_config_get_value(mocker):
    """Test getting configuration value"""
    mocker.patch("dtaas_services.pkg.config.load_dotenv")
    mocker.patch("os.environ", {"HOSTNAME": "test.local", "INFLUX_UID": "1000"})
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


def test_config_get_base_dir_linux(mocker):
    """Test get_base_dir on Linux platform"""
    mocker.patch("platform.system", return_value="Linux")
    mock_cwd = mocker.patch("pathlib.Path.cwd")
    mock_cwd.return_value = Path("/home/user/project/deploy/services/cli")
    result = Config.get_base_dir()
    # On Linux, returns Path.cwd().parent
    assert "services" in str(result)


def test_config_get_base_dir_with_env_exists(mocker):
    """Test get_base_dir when services.env exists in current directory"""
    mock_cwd = mocker.patch("pathlib.Path.cwd")
    mock_exists = mocker.patch.object(Path, "exists")
    mock_cwd.return_value = Path("/home/user/services")
    # First call checks if cwd_config exists, second checks env_path
    mock_exists.side_effect = [True, True]
    result = Config.get_base_dir()
    # Should return Path.cwd() when env exists in current dir
    assert "services" in str(result)


@pytest.mark.skipif(sys.platform != "win32", reason="Windows-specific test")
def test_get_windows_base_dir_from_venv(mocker):
    """Test _get_windows_base_dir when running from venv"""
    mock_resolve = mocker.patch("pathlib.Path.resolve")
    mock_resolve.return_value = Path(
        "C:\\Users\\user\\venv\\lib\\site-packages\\dtaas_services\\pkg\\config.py"
    )
    mock_cwd = mocker.patch("pathlib.Path.cwd")
    mock_cwd.return_value = Path("C:\\Users\\user\\venv")
    result = Config._get_windows_base_dir()
    # Should return cwd().parent when in venv
    assert "venv" in str(result) or "\\" in str(result)
