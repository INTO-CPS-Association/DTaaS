# pylint: disable=redefined-outer-name
# pylint: disable=W0613
"""Tests for MongoDB user management"""

from pathlib import Path
from unittest.mock import patch, Mock
import pytest
from dtaas_services.pkg.cert import create_combined_cert
from dtaas_services.pkg.services.mongodb import permissions_mongodb


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.services.mongodb.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "MONGO_UID": "999",
            "MONGO_GID": "999",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


def test_permissions_mongodb_success_linux(mock_config):
    """Test successful MongoDB permissions setup on Linux"""
    with patch("dtaas_services.pkg.services.mongodb.Config") as mock_cfg, patch(
        "dtaas_services.pkg.services.mongodb.create_combined_cert",
        return_value=(True, "Combined cert"),
    ), patch(
        "dtaas_services.pkg.services.mongodb.set_service_cert_permissions",
        return_value=(True, "privkey set"),
    ), patch("pathlib.Path.mkdir"):
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


def test_permissions_mongodb_os_error(mock_config):
    """Test MongoDB permissions setup with OSError"""
    with patch("platform.system", return_value="Linux"), patch(
        "pathlib.Path.mkdir", side_effect=OSError("Directory creation failed")
    ):
        success, message = permissions_mongodb()
        assert success is False
        assert "Error setting permissions for MongoDB" in message
