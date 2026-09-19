"""Tests for host_ops commands (host setup)"""

from dtaas_services.cmd import services
# pylint: disable=W0621

HOST_SETUP = ["host", "setup"]


def test_setup_success(runner, mock_service_setup):
    """Test successful setup prints next steps with the new spellings"""
    for key in ("copy_certs", "mongodb", "influxdb", "rabbitmq", "thingsboard"):
        mock_service_setup[key].return_value = (True, f"{key} OK")
    result = runner.invoke(services, HOST_SETUP)
    assert result.exit_code == 0
    assert "Configuring RabbitMQ completed" in result.output
    assert "dtaas-services service start" in result.output
    assert "dtaas-services service install -s gitlab" in result.output


def test_setup_cert_copy_fails(runner, mock_service_setup):
    """Test setup fails when cert copy fails"""
    mock_service_setup["copy_certs"].return_value = (False, "Copy failed")
    result = runner.invoke(services, HOST_SETUP)
    assert result.exit_code != 0
    assert "Copy failed" in result.output


def test_setup_config_not_found(runner, mocker):
    """Test setup fails when config not found"""
    mocker.patch("dtaas_services.pkg.utils.os.geteuid", return_value=0, create=True)
    mocker.patch(
        "dtaas_services.pkg.config.Config.__init__",
        side_effect=FileNotFoundError("Config not found"),
    )
    result = runner.invoke(services, HOST_SETUP)
    assert result.exit_code != 0
    assert "Config not found" in result.output
