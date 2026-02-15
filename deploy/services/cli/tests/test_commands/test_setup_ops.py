"""Tests for setup_ops commands (setup, generate-project, install)"""

# pylint: disable=redefined-outer-name
from unittest.mock import patch

from dtaas_services.cmd import services


def test_setup_success(runner, mock_service_setup):
    """Test successful setup"""
    mock_service_setup["copy_certs"].return_value = (True, "Certs copied")
    mock_service_setup["mongodb"].return_value = (True, "MongoDB OK")
    mock_service_setup["influxdb"].return_value = (True, "InfluxDB OK")
    mock_service_setup["rabbitmq"].return_value = (True, "RabbitMQ OK")
    mock_service_setup["thingsboard"].return_value = (True, "ThingsBoard OK")
    result = runner.invoke(services, ["setup"])
    assert result.exit_code == 0
    assert "Configuring RabbitMQ completed" in result.output


def test_setup_cert_copy_fails(runner, mock_service_setup):
    """Test setup fails when cert copy fails"""
    mock_service_setup["copy_certs"].return_value = (False, "Copy failed")
    result = runner.invoke(services, ["setup"])
    assert result.exit_code != 0
    assert "Copy failed" in result.output


def test_setup_config_not_found(runner):
    """Test setup fails when config not found"""
    with patch("dtaas_services.pkg.utils.os.geteuid", return_value=0, create=True):
        with patch(
            "dtaas_services.pkg.config.Config.__init__",
            side_effect=FileNotFoundError("Config not found"),
        ):
            result = runner.invoke(services, ["setup"])
            assert result.exit_code != 0
            assert "Config not found" in result.output


def test_generate_project_custom_path(runner, tmp_path):
    """Test generate-project with custom path"""
    custom_path = tmp_path / "custom"
    custom_path.mkdir()
    result = runner.invoke(services, ["generate-project", "--path", str(custom_path)])
    assert result.exit_code == 0
    assert "Project structure generated" in result.output


def test_generate_project_failure(runner):
    """Test generate-project failure"""
    with patch(
        "dtaas_services.commands.setup_ops.generate_project_structure"
    ) as mock_gen:
        mock_gen.return_value = (False, "Failed to generate project: Path error")
        result = runner.invoke(services, ["generate-project"])
        assert result.exit_code != 0
        assert "Failed to generate project" in result.output


def test_install_invalid_service(runner, mock_service_setup):
    """Test install command with unsupported service name"""
    result = runner.invoke(services, ["install", "-s", "mysql"])
    assert result.exit_code != 0
    assert "only supported for ThingsBoard" in result.output


def test_install_success(runner, mock_service_setup):
    """Test successful install command"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        None,
        "PostgreSQL started",
    )
    with patch(
        "dtaas_services.commands.setup_ops.wait_for_postgres_ready"
    ) as mock_wait, patch(
        "dtaas_services.commands.setup_ops.run_thingsboard_install"
    ) as mock_install:
        result = runner.invoke(services, ["install"])
    assert result.exit_code == 0
    assert "ThingsBoard installation completed" in result.output
    mock_wait.assert_called_once()
    mock_install.assert_called_once()


def test_install_postgres_start_fails(runner, mock_service_setup):
    """Test install command when postgres start fails"""
    mock_service_setup["service_instance"].manage_services.return_value = (
        RuntimeError("Start failed"),
        "Failed to start PostgreSQL",
    )
    result = runner.invoke(services, ["install"])
    assert result.exit_code != 0
    assert "Failed to start PostgreSQL" in result.output


def test_install_file_not_found(runner):
    """Test install command when Service init raises FileNotFoundError"""
    with patch(
        "dtaas_services.commands.setup_ops.check_root_unix"
    ), patch(
        "dtaas_services.commands.setup_ops.Service",
        side_effect=FileNotFoundError("Config not found"),
    ):
        result = runner.invoke(services, ["install"])
    assert result.exit_code != 0
    assert "Config not found" in result.output
