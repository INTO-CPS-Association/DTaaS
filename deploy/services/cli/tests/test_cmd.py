import pytest
from unittest.mock import patch, Mock
from click.testing import CliRunner
from dtaas_services.cmd import services


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_service_setup():
    """Mock Service class and setup functions"""
    with patch("dtaas_services.cmd.Service") as mock_service_class, \
         patch("dtaas_services.cmd.copy_certs") as mock_copy_certs, \
         patch("dtaas_services.cmd.permissions_mongodb") as mock_mongodb, \
         patch("dtaas_services.cmd.permissions_influxdb") as mock_influxdb, \
         patch("dtaas_services.cmd.permissions_rabbitmq") as mock_rabbitmq, \
         patch("dtaas_services.cmd.check_root_unix") as mock_check_root:
        
        service_instance = Mock()
        mock_service_class.return_value = service_instance
        
        yield {
            "service": mock_service_class,
            "service_instance": service_instance,
            "copy_certs": mock_copy_certs,
            "mongodb": mock_mongodb,
            "influxdb": mock_influxdb,
            "rabbitmq": mock_rabbitmq,
            "check_root": mock_check_root
        }


@pytest.fixture
def mock_user_pkg():
    """Mock user management modules"""
    with patch("dtaas_services.cmd.influxdb") as mock_influx, \
         patch("dtaas_services.cmd.rabbitmq") as mock_rabbit:
        yield {"influxdb": mock_influx, "rabbitmq": mock_rabbit}


def test_services_help(runner):
    """Test services command shows help"""
    result = runner.invoke(services, ['--help'])
    assert result.exit_code == 0
    assert 'Manage DTaaS platform services' in result.output


def test_setup_success(runner, mock_service_setup):
    """Test successful setup"""
    mock_service_setup["copy_certs"].return_value = (True, "Certs copied")
    mock_service_setup["mongodb"].return_value = (True, "MongoDB OK")
    mock_service_setup["influxdb"].return_value = (True, "InfluxDB OK")
    mock_service_setup["rabbitmq"].return_value = (True, "RabbitMQ OK")
    mock_service_setup["service_instance"].start_services.return_value = (None, "Started")
    
    result = runner.invoke(services, ['setup'])
    assert result.exit_code == 0
    assert "Services started successfully" in result.output


def test_setup_cert_copy_fails(runner, mock_service_setup):
    """Test setup fails when cert copy fails"""
    mock_service_setup["copy_certs"].return_value = (False, "Copy failed")
    
    result = runner.invoke(services, ['setup'])
    assert result.exit_code != 0
    assert "Copy failed" in result.output


def test_setup_config_not_found(runner):
    """Test setup fails when config not found"""
    with patch("dtaas_services.cmd.Config", side_effect=FileNotFoundError("Config not found")):
        result = runner.invoke(services, ['setup'])
        assert result.exit_code != 0
        assert "Config not found" in result.output


def test_start_success(runner, mock_service_setup):
    """Test successful service start"""
    mock_service_setup["service_instance"].start_services.return_value = (None, "Services started")
    
    result = runner.invoke(services, ['start'])
    assert result.exit_code == 0
    assert "Services started" in result.output


def test_start_failure(runner, mock_service_setup):
    """Test service start failure"""
    mock_service_setup["service_instance"].start_services.return_value = (FileNotFoundError("Docker not found"), "Docker not found")
    
    result = runner.invoke(services, ['start'])
    assert result.exit_code != 0
    assert "Docker not found" in result.output


def test_stop_success(runner, mock_service_setup):
    """Test successful service stop"""
    mock_service_setup["service_instance"].stop_services.return_value = (None, "Services stopped")
    
    result = runner.invoke(services, ['stop'])
    assert result.exit_code == 0
    assert "Services stopped" in result.output


def test_stop_failure(runner, mock_service_setup):
    """Test service stop failure"""
    mock_service_setup["service_instance"].stop_services.return_value = (Exception("Stop failed"), "Stop failed")
    
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
