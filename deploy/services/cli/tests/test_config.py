"""Tests for configuration management"""
import pytest

from src.pkg.config import Config


@pytest.fixture
def temp_env_file(tmp_path):
    """Create a temporary services.env file"""
    env_file = tmp_path / "config" / "services.env"
    env_file.parent.mkdir(parents=True)
    env_file.write_text(
        "HOSTNAME=test.example.com\n"
        "INFLUX_UID=1000\n"
        "INFLUX_GID=1000\n"
        "MONGO_UID=999\n"
        "MONGO_GID=999\n"
        "RABBIT_UID=999\n"
        "CERTS_SRC=/tmp/certs\n"
    )
    return env_file


def test_config_initialization_with_path(temp_env_file):
    """Test Config initialization with custom path"""
    services_dir = temp_env_file.parent.parent
    config = Config(services_dir=services_dir)

    assert config.base_dir == services_dir
    assert config.env_file == temp_env_file


def test_config_get_required_env(temp_env_file):
    """Test getting required environment variable"""
    services_dir = temp_env_file.parent.parent
    config = Config(services_dir=services_dir)

    assert config.get_required_env("HOSTNAME") == "test.example.com"
    assert config.get_required_env("INFLUX_UID") == "1000"


def test_config_get_required_env_missing(temp_env_file):
    """Test getting missing required environment variable"""
    services_dir = temp_env_file.parent.parent
    config = Config(services_dir=services_dir)

    with pytest.raises(RuntimeError) as exc_info:
        config.get_required_env("MISSING_VAR")

    assert "MISSING_VAR" in str(exc_info.value)


def test_config_get_env_with_default(temp_env_file):
    """Test getting environment variable with default"""
    services_dir = temp_env_file.parent.parent
    config = Config(services_dir=services_dir)

    assert config.get_env("HOSTNAME") == "test.example.com"
    assert config.get_env("MISSING_VAR", "default") == "default"


def test_config_missing_env_file(tmp_path):
    """Test Config with missing env file"""
    services_dir = tmp_path / "services"
    services_dir.mkdir()

    config = Config(services_dir=services_dir)

    with pytest.raises(RuntimeError) as exc_info:
        config.get_required_env("HOSTNAME")

    assert "HOSTNAME" in str(exc_info.value)
