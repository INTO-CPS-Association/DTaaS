"""Shared fixtures for command tests"""

# pylint: disable=redefined-outer-name
from unittest.mock import patch, Mock

import pytest
from click.testing import CliRunner


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_service_setup():
    """Mock Service class and setup functions"""
    with patch(
        "dtaas_services.commands.service_ops.Service"
    ) as mock_service_class, patch(
        "dtaas_services.commands.utility.Service"
    ) as mock_utility_service_class, patch(
        "dtaas_services.commands.setup_ops.Service"
    ) as mock_setup_service_class, patch(
        "dtaas_services.commands.setup_ops.copy_certs"
    ) as mock_copy_certs, patch(
        "dtaas_services.commands.setup_ops.permissions_mongodb"
    ) as mock_mongodb, patch(
        "dtaas_services.commands.setup_ops.permissions_influxdb"
    ) as mock_influxdb, patch(
        "dtaas_services.commands.setup_ops.permissions_rabbitmq"
    ) as mock_rabbitmq, patch(
        "dtaas_services.commands.setup_ops.permissions_thingsboard"
    ) as mock_thingsboard, patch(
        "dtaas_services.commands.setup_ops.check_root_unix"
    ) as mock_check_root:
        service_instance = Mock()
        service_instance.get_all_containers.return_value = (None, {})
        service_instance.get_running_services.return_value = set()
        service_instance.docker = Mock()
        mock_service_class.return_value = service_instance
        mock_utility_service_class.return_value = service_instance
        mock_setup_service_class.return_value = service_instance
        yield {
            "service": mock_service_class,
            "service_instance": service_instance,
            "copy_certs": mock_copy_certs,
            "mongodb": mock_mongodb,
            "influxdb": mock_influxdb,
            "rabbitmq": mock_rabbitmq,
            "thingsboard": mock_thingsboard,
            "check_root": mock_check_root,
        }
