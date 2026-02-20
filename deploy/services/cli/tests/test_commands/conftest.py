"""Shared fixtures for command tests"""

# pylint: disable=redefined-outer-name
from unittest.mock import Mock

import pytest
from click.testing import CliRunner


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_service_setup(mocker):
    """Mock Service class and setup functions"""
    mock_service_class = mocker.patch("dtaas_services.commands.service_ops.Service")
    mock_utility_service_class = mocker.patch("dtaas_services.commands.utility.Service")
    mock_setup_service_class = mocker.patch("dtaas_services.commands.setup_ops.Service")
    mock_copy_certs = mocker.patch("dtaas_services.commands.setup_ops.copy_certs")
    mock_mongodb = mocker.patch("dtaas_services.commands.setup_ops.permissions_mongodb")
    mock_influxdb = mocker.patch(
        "dtaas_services.commands.setup_ops.permissions_influxdb"
    )
    mock_rabbitmq = mocker.patch(
        "dtaas_services.commands.setup_ops.permissions_rabbitmq"
    )
    mock_thingsboard = mocker.patch(
        "dtaas_services.commands.setup_ops.permissions_thingsboard"
    )
    mocker.patch("dtaas_services.commands.setup_ops.check_root_unix")
    service_instance = Mock()
    service_instance.get_all_containers.return_value = (None, {})
    service_instance.get_running_services.return_value = set()
    service_instance.docker = Mock()
    mock_service_class.return_value = service_instance
    mock_utility_service_class.return_value = service_instance
    mock_setup_service_class.return_value = service_instance
    return {
        "service": mock_service_class,
        "service_instance": service_instance,
        "copy_certs": mock_copy_certs,
        "mongodb": mock_mongodb,
        "influxdb": mock_influxdb,
        "rabbitmq": mock_rabbitmq,
        "thingsboard": mock_thingsboard,
    }
