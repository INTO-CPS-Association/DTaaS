"""Tests for MongoDB user management"""

from pathlib import Path
from unittest.mock import Mock
import pytest
from dtaas_services.pkg.services.mongodb import permissions_mongodb
# pylint: disable=W0621


@pytest.fixture
def mock_config(mocker):
    """Mock Config class"""
    mock = mocker.patch("dtaas_services.pkg.services.mongodb.Config")
    mock_instance = Mock()
    mock_instance.get_value.side_effect = lambda key: {
        "HOSTNAME": "test.example.com",
        "MONGO_UID": "999",
        "MONGO_GID": "999",
    }.get(key, "default")
    mock.return_value = mock_instance
    mock.get_base_dir.return_value = Path("/test/base")
    return mock


def test_permissions_mongodb_success_linux(mocker):
    """Test successful MongoDB permissions setup on Linux"""
    mock_cfg = mocker.patch("dtaas_services.pkg.services.mongodb.Config")
    mocker.patch(
        "dtaas_services.pkg.services.mongodb.create_combined_cert",
        return_value=(True, "Combined cert"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.mongodb.set_service_cert_permissions",
        return_value=(True, "privkey set"),
    )
    mocker.patch("pathlib.Path.mkdir")
    # Setup Config mocks both instance and class method
    mock_instance = Mock()
    mock_instance.get_value.side_effect = lambda key: {
        "HOSTNAME": "test.example.com",
        "MONGO_UID": "999",
        "MONGO_GID": "999",
    }.get(key, "default")
    mock_cfg.return_value = mock_instance
    mock_cfg.get_base_dir = Mock(return_value=Path("/test/base"))

    success, _ = permissions_mongodb()
    assert success is True


def test_permissions_mongodb_os_error(mocker):
    """Test MongoDB permissions setup with OSError"""
    mocker.patch("platform.system", return_value="Linux")
    mocker.patch("pathlib.Path.mkdir", side_effect=OSError("Directory creation failed"))
    success, message = permissions_mongodb()
    assert success is False
    assert "Error setting permissions for MongoDB" in message
