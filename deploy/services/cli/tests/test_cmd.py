"""Tests for CLI commands"""
import pytest
from click.testing import CliRunner
from unittest.mock import patch, MagicMock, call
from src.cmd import cli


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_config():
    """Mock Config object"""
    from pathlib import Path
    with patch("src.cmd.Config") as mock:
        config_instance = MagicMock()
        config_instance.base_dir = Path("/mock/path")
        mock.return_value = config_instance
        yield mock


@pytest.fixture
def mock_service_setup():
    """Mock ServiceSetup object"""
    with patch("src.cmd.ServiceSetup") as mock:
        setup_instance = MagicMock()
        setup_instance.copy_certs.return_value = (True, "Certs copied")
        setup_instance.setup_mongodb.return_value = (True, "MongoDB setup")
        setup_instance.setup_influxdb.return_value = (True, "InfluxDB setup")
        setup_instance.setup_rabbitmq.return_value = (True, "RabbitMQ setup")
        setup_instance.start_services.return_value = (True, "Services started")
        mock.return_value = setup_instance
        yield mock


@patch("src.cmd.check_root_unix")
def test_setup_command_success(mock_root, runner, mock_config, mock_service_setup):
    """Test successful setup command"""
    mock_root.return_value = None
    
    result = runner.invoke(cli, ["setup"])
    
    assert result.exit_code == 0
    assert "Services setup completed successfully" in result.output
    mock_service_setup.return_value.copy_certs.assert_called_once()
    mock_service_setup.return_value.setup_mongodb.assert_called_once()
    mock_service_setup.return_value.setup_influxdb.assert_called_once()
    mock_service_setup.return_value.setup_rabbitmq.assert_called_once()
    mock_service_setup.return_value.start_services.assert_called_once()


@patch("src.cmd.check_root_unix")
def test_setup_command_failure(mock_root, runner, mock_config, mock_service_setup):
    """Test setup command with failure"""
    mock_root.return_value = None
    mock_service_setup.return_value.copy_certs.return_value = (
        False, "Failed to copy certs"
    )
    
    result = runner.invoke(cli, ["setup"])
    
    assert result.exit_code == 1
    assert "ERROR" in result.output
    assert "Failed to copy certs" in result.output


def test_start_command_success(runner, mock_config, mock_service_setup):
    """Test successful start command"""
    result = runner.invoke(cli, ["start"])
    
    assert result.exit_code == 0
    assert "Services started successfully" in result.output
    mock_service_setup.return_value.start_services.assert_called_once()


def test_start_command_failure(runner, mock_config, mock_service_setup):
    """Test start command with failure"""
    mock_service_setup.return_value.start_services.return_value = (
        False, "Failed to start services"
    )
    
    result = runner.invoke(cli, ["start"])
    
    assert result.exit_code == 1
    assert "ERROR" in result.output
    assert "Failed to start services" in result.output


@patch("src.cmd.influxdb.add_influxdb_users")
@patch("src.cmd.rabbitmq.add_rabbitmq_users")
def test_user_add_command_success(
    mock_rabbitmq, mock_influxdb, runner, mock_config
):
    """Test successful user add command"""
    mock_influxdb.return_value = (True, "InfluxDB users added")
    mock_rabbitmq.return_value = (True, "RabbitMQ users added")
    
    with patch("pathlib.Path.exists", return_value=True):
        result = runner.invoke(cli, ["user", "add"])
    
    assert result.exit_code == 0
    assert "Users added successfully" in result.output
    mock_influxdb.assert_called_once()
    mock_rabbitmq.assert_called_once()


@patch("src.cmd.influxdb.add_influxdb_users")
def test_user_add_command_missing_credentials(mock_influxdb, runner, mock_config):
    """Test user add command with missing credentials file"""
    with patch("pathlib.Path.exists", return_value=False):
        result = runner.invoke(cli, ["user", "add"])
    
    assert result.exit_code == 1
    assert "Credentials file not found" in result.output
    mock_influxdb.assert_not_called()


@patch("src.cmd.influxdb.add_influxdb_users")
@patch("src.cmd.rabbitmq.add_rabbitmq_users")
def test_user_add_command_influxdb_failure(
    mock_rabbitmq, mock_influxdb, runner, mock_config
):
    """Test user add command with InfluxDB failure"""
    mock_influxdb.return_value = (False, "InfluxDB error")
    
    with patch("pathlib.Path.exists", return_value=True):
        result = runner.invoke(cli, ["user", "add"])
    
    assert result.exit_code == 1
    assert "ERROR" in result.output
    assert "InfluxDB error" in result.output
    mock_rabbitmq.assert_not_called()
