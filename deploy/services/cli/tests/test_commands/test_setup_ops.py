"""Tests for setup_ops commands (setup, generate-project)"""

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


def test_generate_project_default_path(runner, tmp_path):
    """Test generate-project with default path"""
    with runner.isolated_filesystem(temp_dir=tmp_path):
        result = runner.invoke(services, ["generate-project"])
        assert result.exit_code == 0 or "Warning" in result.output
        assert "Generating project structure" in result.output


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
