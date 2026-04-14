"""Tests for MongoDB user management"""

from pathlib import Path
from unittest.mock import Mock
from dtaas_services.pkg.services.mongodb import (
    _add_mongodb_user,
    permissions_mongodb,
    setup_mongodb_users,
)
# pylint: disable=W0621


def test_add_mongodb_user_success(mocker):
    """Test successful MongoDB user addition"""
    mock_cfg = mocker.patch("dtaas_services.pkg.services.mongodb.Config")
    mock_cfg.return_value.get_value.side_effect = lambda key: {
        "MONGODB_ADMIN_USERNAME": "admin",
        "MONGODB_ADMIN_PASSWORD": "adminpass",  # noqa: S105 # NOSONAR
    }[key]
    mock_exec = mocker.patch(
        "dtaas_services.pkg.services.mongodb.execute_docker_command"
    )
    mock_exec.return_value = (True, "success")
    success, error = _add_mongodb_user("testuser", "testpass")
    assert success is True
    assert error == ""
    assert mock_exec.call_count == 1


def test_add_mongodb_user_fails(mocker):
    """Test MongoDB user addition failure"""
    mock_cfg = mocker.patch("dtaas_services.pkg.services.mongodb.Config")
    mock_cfg.return_value.get_value.side_effect = lambda key: {
        "MONGODB_ADMIN_USERNAME": "admin",
        "MONGODB_ADMIN_PASSWORD": "adminpass",  # noqa: S105 # NOSONAR
    }[key]
    mock_exec = mocker.patch(
        "dtaas_services.pkg.services.mongodb.execute_docker_command"
    )
    mock_exec.return_value = (False, "connection refused")
    success, error = _add_mongodb_user("testuser", "testpass")
    assert success is False
    assert "Failed to add MongoDB user testuser" in error


def test_setup_mongodb_users_success(mocker):
    """Test setup_mongodb_users returns success"""
    mocker.patch(
        "dtaas_services.pkg.services.mongodb.process_credentials_file",
        return_value=(True, "MongoDB users created successfully"),
    )
    success, msg = setup_mongodb_users()
    assert success is True
    assert "MongoDB users created successfully" in msg


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
