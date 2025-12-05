"""Tests for service setup functionality"""
from subprocess import CalledProcessError
from unittest.mock import MagicMock, patch

import pytest

from src.pkg.config import Config
from src.pkg.setup import ServiceSetup


@pytest.fixture
def mock_config(tmp_path):
    """Create a mock configuration"""
    from pathlib import Path
    config = MagicMock(spec=Config)
    config.base_dir = Path(str(tmp_path))
    config.get_required_env.side_effect = lambda key: {
        "HOSTNAME": "test.example.com",
        "INFLUX_UID": "1000",
        "INFLUX_GID": "1000",
        "MONGO_UID": "999",
        "MONGO_GID": "999",
        "RABBIT_UID": "999",
        "CERTS_SRC": str(tmp_path / "source_certs"),
    }.get(key, "default")
    return config


@pytest.fixture
def service_setup(mock_config):
    """Create ServiceSetup instance"""
    return ServiceSetup(mock_config)


def test_service_setup_initialization(mock_config, service_setup):
    """Test ServiceSetup initialization"""
    assert service_setup.config == mock_config
    assert service_setup.host_name == "test.example.com"
    assert service_setup.influx["uid"] == "1000"
    assert service_setup.mongo["uid"] == "999"
    assert service_setup.rabbitmq["uid"] == "999"


def test_copy_certs_success(service_setup, tmp_path):
    """Test successful certificate copying"""
    # Create source directory with certificates
    source_dir = tmp_path / "source_certs"
    source_dir.mkdir()
    (source_dir / "privkey1.pem").write_text("private key")
    (source_dir / "fullchain1.pem").write_text("full chain")

    success, message = service_setup.copy_certs()

    assert success is True
    assert "Certificates copied" in message


def test_copy_certs_missing_source(service_setup, tmp_path):
    """Test certificate copying with missing source"""
    success, message = service_setup.copy_certs()

    assert success is False
    assert "not found" in message


@patch("src.pkg.setup.subprocess.run")
def test_setup_mongodb_success(mock_run, service_setup):  # noqa: ARG001
    """Test successful MongoDB setup"""
    # Create certificate files
    certs_dir = service_setup.certs["dir"]
    certs_dir.mkdir(parents=True)
    service_setup.certs["privkey"].write_text("private key")
    service_setup.certs["fullchain"].write_text("full chain")

    with patch("src.pkg.setup.platform.system", return_value="Windows"):
        success, message = service_setup.setup_mongodb()

    assert success is True
    assert "combined.pem created" in message
    assert service_setup.certs["combined"].exists()


@patch("src.pkg.setup.subprocess.run")
@patch("src.pkg.setup.platform.system", return_value="linux")
def test_setup_influxdb_success(mock_system, mock_run, service_setup):  # noqa: ARG001
    """Test successful InfluxDB setup"""
    # Create certificate files
    certs_dir = service_setup.certs["dir"]
    certs_dir.mkdir(parents=True)
    service_setup.certs["privkey"].write_text("private key")

    success, message = service_setup.setup_influxdb()

    assert success is True
    assert "privkey-influxdb.pem" in message
    assert service_setup.influx["key"].exists()


@patch("src.pkg.setup.subprocess.run")
@patch("src.pkg.setup.platform.system", return_value="linux")
def test_setup_rabbitmq_success(mock_system, mock_run, service_setup):  # noqa: ARG001
    """Test successful RabbitMQ setup"""
    # Create certificate files
    certs_dir = service_setup.certs["dir"]
    certs_dir.mkdir(parents=True)
    service_setup.certs["privkey"].write_text("private key")

    success, message = service_setup.setup_rabbitmq()

    assert success is True
    assert "privkey-rabbitmq.pem" in message
    assert service_setup.rabbitmq["key"].exists()


@patch("src.pkg.setup.subprocess.run")
def test_start_services_success(mock_run, service_setup):
    """Test successful service start"""
    mock_result = MagicMock()
    mock_result.stdout = "Services started"
    mock_run.return_value = mock_result

    success, message = service_setup.start_services()

    assert success is True
    assert "started successfully" in message
    mock_run.assert_called_once()


@patch("src.pkg.setup.subprocess.run")
def test_start_services_failure(mock_run, service_setup):
    """Test service start failure"""
    mock_run.side_effect = CalledProcessError(1, "docker", stderr="Docker error")

    success, message = service_setup.start_services()

    assert success is False
    assert "Error" in message
