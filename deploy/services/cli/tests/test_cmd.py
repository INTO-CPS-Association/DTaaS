"""Tests for DTaaS Services CLI commands"""
import pytest
from unittest.mock import patch, Mock
from click.testing import CliRunner
from dtaas_services.cmd import services, _copy_directory_or_file, _copy_template_to_config


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


class TestHelperFunctions:
    """Tests for helper functions"""
    
    def test_copy_directory_or_file_directory(self, tmp_path):
        """Test copying a directory"""
        src_dir = tmp_path / "source"
        src_dir.mkdir()
        (src_dir / "file.txt").write_text("content")
        
        dest_dir = tmp_path / "dest"
        
        _copy_directory_or_file(src_dir, dest_dir, "test_dir")
        
        assert dest_dir.exists()
        assert (dest_dir / "file.txt").exists()
    

    def test_copy_directory_or_file_file(self, tmp_path):
        """Test copying a file"""
        src_file = tmp_path / "source.txt"
        src_file.write_text("content")
        
        dest_file = tmp_path / "dest.txt"
        
        _copy_directory_or_file(src_file, dest_file, "test_file")
        
        assert dest_file.exists()
        assert dest_file.read_text() == "content"
    

    def test_copy_directory_or_file_not_exists(self, tmp_path, capsys):
        """Test when source doesn't exist"""
        src_path = tmp_path / "nonexistent"
        dest_path = tmp_path / "dest"
        
        _copy_directory_or_file(src_path, dest_path, "test")
        
        captured = capsys.readouterr()
        assert "Warning" in captured.err
    

    def test_copy_directory_or_file_already_exists(self, tmp_path, capsys):
        """Test when destination already exists"""
        src_dir = tmp_path / "source"
        src_dir.mkdir()
        
        dest_dir = tmp_path / "dest"
        dest_dir.mkdir()
        
        _copy_directory_or_file(src_dir, dest_dir, "test_dir")
        
        captured = capsys.readouterr()
        assert "Skipping" in captured.out
    

    def test_copy_template_to_config(self, tmp_path):
        """Test copying template to config"""
        config_dir = tmp_path / "config"
        config_dir.mkdir()
        
        template_file = config_dir / "services.env.template"
        template_file.write_text("TEMPLATE=value")
        
        _copy_template_to_config(config_dir, "services.env.template", "services.env")
        
        actual_file = config_dir / "services.env"
        assert actual_file.exists()
        assert actual_file.read_text() == "TEMPLATE=value"
    

    def test_copy_template_to_config_already_exists(self, tmp_path):
        """Test when actual config already exists"""
        config_dir = tmp_path / "config"
        config_dir.mkdir()
        
        template_file = config_dir / "services.env.template"
        template_file.write_text("TEMPLATE=value")
        
        actual_file = config_dir / "services.env"
        actual_file.write_text("EXISTING=value")
        
        _copy_template_to_config(config_dir, "services.env.template", "services.env")
        
        # Should not overwrite existing file
        assert actual_file.read_text() == "EXISTING=value"



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
    
    result = runner.invoke(services, ['setup'])
    assert result.exit_code == 0
    assert "Configuring RabbitMQ completed" in result.output


def test_setup_cert_copy_fails(runner, mock_service_setup):
    """Test setup fails when cert copy fails"""
    mock_service_setup["copy_certs"].return_value = (False, "Copy failed")
    
    result = runner.invoke(services, ['setup'])
    assert result.exit_code != 0
    assert "Copy failed" in result.output


def test_setup_config_not_found(runner):
    """Test setup fails when config not found"""
    with patch("dtaas_services.pkg.config.Config.__init__", side_effect=FileNotFoundError("Config not found")):
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
    assert "InfluxDB: Failed InfluxDB error" in result.output
    assert "RabbitMQ: Added to RabbitMQ" in result.output


def test_add_users_both_fail(runner, mock_user_pkg):
    """Test when both services fail"""
    mock_user_pkg["influxdb"].setup_influxdb_users.return_value = (False, "InfluxDB failed")
    mock_user_pkg["rabbitmq"].setup_rabbitmq_users.return_value = (False, "RabbitMQ failed")
    
    result = runner.invoke(services, ['user', 'add'])
    assert result.exit_code == 0
    assert "InfluxDB: Failed InfluxDB failed" in result.output
    assert "RabbitMQ: Failed RabbitMQ failed" in result.output


def test_status_success(runner, mock_service_setup):
    """Test successful status check with rich formatting"""
    # Mock Container objects
    mock_container1 = Mock()
    mock_container1.name = "grafana"
    mock_container1.state.status = "running"
    
    mock_container2 = Mock()
    mock_container2.name = "influxdb"
    mock_container2.state.status = "exited"
    
    mock_service_setup["service_instance"].get_status.return_value = (
        None, [mock_container1, mock_container2]
    )
    
    result = runner.invoke(services, ['status'])
    assert result.exit_code == 0
    # Check that service names appear in output
    assert "Grafana" in result.output or "grafana" in result.output


def test_status_no_services(runner, mock_service_setup):
    """Test status when no services are running"""
    mock_service_setup["service_instance"].get_status.return_value = (None, [])
    
    result = runner.invoke(services, ['status'])
    assert result.exit_code == 0
    assert "No services" in result.output or "running" in result.output


def test_status_failure(runner, mock_service_setup):
    """Test status command when it fails"""
    mock_service_setup["service_instance"].get_status.return_value = (
        FileNotFoundError("Compose file not found"), []
    )
    
    result = runner.invoke(services, ['status'])
    assert result.exit_code != 0
    assert "Compose file not found" in result.output


def test_status_with_service_filter(runner, mock_service_setup):
    """Test status command with specific services"""
    mock_container = Mock()
    mock_container.name = "grafana"
    mock_container.state.status = "running"
    
    mock_service_setup["service_instance"].get_status.return_value = (None, [mock_container])
    
    result = runner.invoke(services, ['status', '--services', 'grafana,influxdb'])
    assert result.exit_code == 0


def test_restart_success(runner, mock_service_setup):
    """Test successful service restart"""
    mock_service_setup["service_instance"].restart_services.return_value = (None, "Services restarted")
    
    result = runner.invoke(services, ['restart'])
    assert result.exit_code == 0
    assert "Services restarted" in result.output


def test_restart_specific_services(runner, mock_service_setup):
    """Test restart with specific services"""
    mock_service_setup["service_instance"].restart_services.return_value = (None, "Services restarted")
    
    result = runner.invoke(services, ['restart', '--services', 'grafana'])
    assert result.exit_code == 0


def test_restart_failure(runner, mock_service_setup):
    """Test restart failure"""
    mock_service_setup["service_instance"].restart_services.return_value = (
        RuntimeError("Restart failed"), "Restart failed"
    )
    
    result = runner.invoke(services, ['restart'])
    assert result.exit_code != 0
    assert "Restart failed" in result.output


def test_remove_success(runner, mock_service_setup):
    """Test successful service removal"""
    mock_service_setup["service_instance"].remove_services.return_value = (None, "Services removed")
    
    result = runner.invoke(services, ['remove'])
    assert result.exit_code == 0
    assert "Services removed" in result.output


def test_remove_with_volumes(runner, mock_service_setup):
    """Test service removal with volumes"""
    mock_service_setup["service_instance"].remove_services.return_value = (None, "Services and volumes removed")
    
    result = runner.invoke(services, ['remove', '--volumes'])
    assert result.exit_code == 0
    mock_service_setup["service_instance"].remove_services.assert_called_once()


def test_remove_specific_services(runner, mock_service_setup):
    """Test removing specific services"""
    mock_service_setup["service_instance"].remove_services.return_value = (None, "Services removed")
    
    result = runner.invoke(services, ['remove', '--services', 'grafana,influxdb'])
    assert result.exit_code == 0


def test_remove_failure(runner, mock_service_setup):
    """Test remove failure"""
    mock_service_setup["service_instance"].remove_services.return_value = (
        FileNotFoundError("File not found"), "File not found"
    )
    
    result = runner.invoke(services, ['remove'])
    assert result.exit_code != 0


def test_generate_project_default_path(runner, tmp_path):
    """Test generate-project with default path"""
    # Use the runner's isolated file system
    with runner.isolated_filesystem(temp_dir=tmp_path):
        result = runner.invoke(services, ['generate-project'])
        
        # Should succeed - warnings are OK for missing source files
        assert result.exit_code == 0 or "Warning" in result.output
        assert "Generating project structure" in result.output


def test_generate_project_custom_path(runner, tmp_path):
    """Test generate-project with custom path"""
    custom_path = tmp_path / "custom"
    custom_path.mkdir()
    
    result = runner.invoke(services, ['generate-project', '--path', str(custom_path)])
    
    # Should succeed and create project structure
    assert result.exit_code == 0
    assert "Project structure generated" in result.output


def test_generate_project_failure(runner):
    """Test generate-project failure"""
    with patch("dtaas_services.cmd.Path") as mock_path:
        mock_path.side_effect = Exception("Path error")
        
        result = runner.invoke(services, ['generate-project'])
        assert result.exit_code != 0
        assert "Failed to generate project" in result.output

