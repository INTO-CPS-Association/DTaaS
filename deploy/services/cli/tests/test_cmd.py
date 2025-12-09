import pytest
from unittest.mock import patch, Mock
from click.testing import CliRunner
from src.cmd import services


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_setup_pkg():
    """Mock setup package"""
    with patch("src.cmd.Config") as mock_config, \
         patch("src.cmd.ServicesSetup") as mock_setup_class:
        
        config_instance = Mock()
        mock_config.return_value = config_instance
        
        setup_instance = Mock()
        mock_setup_class.return_value = setup_instance
        
        yield {"config": mock_config, "setup": setup_instance}


@pytest.fixture
def mock_user_pkg():
    """Mock user management modules"""
    with patch("src.cmd.influxdb") as mock_influx, \
         patch("src.cmd.rabbitmq") as mock_rabbit:
        yield {"influxdb": mock_influx, "rabbitmq": mock_rabbit}


def test_services_help(runner):
    """Test services command shows help"""
    result = runner.invoke(services, ['--help'])
    assert result.exit_code == 0
    assert 'Manage DTaaS platform services' in result.output


def test_setup_success(runner, mock_setup_pkg):
    """Test successful setup"""
    mock_setup_pkg["setup"].copy_certs.return_value = (True, "Certs copied")
    mock_setup_pkg["setup"].permissions_mongodb.return_value = (True, "MongoDB OK")
    mock_setup_pkg["setup"].permissions_influxdb.return_value = (True, "InfluxDB OK")
    mock_setup_pkg["setup"].permissions_rabbitmq.return_value = (True, "RabbitMQ OK")
    mock_setup_pkg["setup"].start_services.return_value = (None, "Started")
    
    result = runner.invoke(services, ['setup'])
    assert result.exit_code == 0
    assert "Services started successfully" in result.output


def test_setup_cert_copy_fails(runner, mock_setup_pkg):
    """Test setup fails when cert copy fails"""
    mock_setup_pkg["setup"].copy_certs.return_value = (False, "Copy failed")
    
    result = runner.invoke(services, ['setup'])
    assert result.exit_code != 0
    assert "Copy failed" in result.output


def test_setup_config_not_found(runner):
    """Test setup fails when config not found"""
    with patch("src.cmd.Config", side_effect=FileNotFoundError("Config not found")):
        result = runner.invoke(services, ['setup'])
        assert result.exit_code != 0
        assert "Config not found" in result.output


def test_start_success(runner, mock_setup_pkg):
    """Test successful service start"""
    mock_setup_pkg["setup"].start_services.return_value = (None, "Services started")
    
    result = runner.invoke(services, ['start'])
    assert result.exit_code == 0
    assert "Services started" in result.output


def test_start_failure(runner, mock_setup_pkg):
    """Test service start failure"""
    mock_setup_pkg["setup"].start_services.return_value = (FileNotFoundError("Docker not found"), "Docker not found")
    
    result = runner.invoke(services, ['start'])
    assert result.exit_code != 0
    assert "Docker not found" in result.output


def test_stop_success(runner, mock_setup_pkg):
    """Test successful service stop"""
    mock_setup_pkg["setup"].stop_services.return_value = (None, "Services stopped")
    
    result = runner.invoke(services, ['stop'])
    assert result.exit_code == 0
    assert "Services stopped" in result.output


def test_stop_failure(runner, mock_setup_pkg):
    """Test service stop failure"""
    mock_setup_pkg["setup"].stop_services.return_value = (Exception("Stop failed"), "Stop failed")
    
    result = runner.invoke(services, ['stop'])
    assert result.exit_code != 0


def test_user_help(runner):
    """Test user command shows help"""
    result = runner.invoke(services, ['user', '--help'])
    assert result.exit_code == 0
    assert 'User account management' in result.output


def test_add_users_success(runner, mock_user_pkg):
    """Test successful user addition"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (True, "Added to InfluxDB")
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (True, "Added to RabbitMQ")
    
    result = runner.invoke(services, ['user', 'add'])
    assert result.exit_code == 0
    assert "Adding users from CSV file" in result.output
    assert "InfluxDB: Added to InfluxDB" in result.output
    assert "RabbitMQ: Added to RabbitMQ" in result.output


def test_add_users_influxdb_fails(runner, mock_user_pkg):
    """Test when InfluxDB addition fails"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (False, "InfluxDB error")
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (True, "Added to RabbitMQ")
    
    result = runner.invoke(services, ['user', 'add'])
    assert result.exit_code == 0
    assert "InfluxDB: Failed - InfluxDB error" in result.output
    assert "RabbitMQ: Added to RabbitMQ" in result.output


def test_add_users_both_fail(runner, mock_user_pkg):
    """Test when both services fail"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (False, "InfluxDB failed")
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (False, "RabbitMQ failed")
    
    result = runner.invoke(services, ['user', 'add'])
    assert result.exit_code == 0
    assert "InfluxDB: Failed - InfluxDB failed" in result.output
    assert "RabbitMQ: Failed - RabbitMQ failed" in result.output
