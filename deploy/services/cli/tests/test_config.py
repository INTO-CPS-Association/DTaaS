"""Tests for configuration module"""
from pathlib import Path
from unittest.mock import patch

import pytest

from dtaas_services.pkg.config import Config


def test_config_file_not_found():
    """Test error when config file doesn't exist"""
    with patch.object(Path, 'exists', return_value=False):
        with pytest.raises(FileNotFoundError) as exc_info:
            Config()
        assert "Configuration file not found" in str(exc_info.value)


def test_config_get_value():
    """Test getting configuration value"""
    with patch("dtaas_services.pkg.config.load_dotenv"), \
         patch("os.environ", {"HOSTNAME": "test.local", "INFLUX_UID": "1000"}):
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
