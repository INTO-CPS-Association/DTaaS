"""Tests for MongoDB user management"""

from pathlib import Path
from unittest.mock import Mock, mock_open
import pytest
from dtaas_services.pkg.services.mongodb import (
    _add_mongodb_user,
    _build_create_user_script,
    permissions_mongodb,
    setup_mongodb_users,
)
from dtaas_services.pkg.utils import create_users_from_credentials
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
        "MONGODB_ADMIN_USERNAME": "adminuser",
        "MONGODB_ADMIN_PASSWORD": "adminpass",
    }.get(key, "default")
    mock.return_value = mock_instance
    mock.get_base_dir.return_value = Path("/test/base")
    return mock


def test_build_create_user_script_basic():
    """Test that create user script contains expected parts"""
    script = _build_create_user_script("alice", "secret")
    assert "alice" in script
    assert "secret" in script
    assert "createUser" in script
    assert "readWrite" in script


def test_build_create_user_script_escapes_special_chars():
    """Test that single quotes in credentials are escaped"""
    script = _build_create_user_script("o'brien", "pa'ss")
    assert "o\\'brien" in script
    assert "pa\\'ss" in script


def test_add_mongodb_user_success(mocker):
    """Test successful MongoDB user addition"""
    mock_exec = mocker.patch(
        "dtaas_services.pkg.services.mongodb.execute_docker_command"
    )
    mock_exec.return_value = (True, "success")
    success, error = _add_mongodb_user("testuser", "testpass")
    assert success is True
    assert error == ""
    assert mock_exec.call_count == 1


def test_add_mongodb_user_already_exists(mocker):
    """Test MongoDB user addition when user already exists"""
    mock_exec = mocker.patch(
        "dtaas_services.pkg.services.mongodb.execute_docker_command"
    )
    mock_exec.return_value = (False, "already exists")
    success, error = _add_mongodb_user("testuser", "testpass")
    assert success is True
    assert error == ""


def test_add_mongodb_user_fails(mocker):
    """Test MongoDB user addition failure"""
    mock_exec = mocker.patch(
        "dtaas_services.pkg.services.mongodb.execute_docker_command"
    )
    mock_exec.return_value = (False, "connection refused")
    success, error = _add_mongodb_user("testuser", "testpass")
    assert success is False
    assert "Failed to add MongoDB user testuser" in error


def test_create_users_from_credentials_success(mocker):
    """Test creating MongoDB users from credentials file"""
    csv_data = "username,password\nuser1,pass1\nuser2,pass2\n"
    mock_file = mock_open(read_data=csv_data)()
    mock_add = mocker.patch("dtaas_services.pkg.services.mongodb._add_mongodb_user")
    mock_add.return_value = (True, "")
    success, error = create_users_from_credentials(mock_file, mock_add)
    assert success is True
    assert error == ""
    assert mock_add.call_count == 2


def test_create_users_from_credentials_failure(mocker):
    """Test creating MongoDB users when user creation fails"""
    csv_data = "username,password\nuser1,pass1\nuser2,pass2\n"
    mock_file = mock_open(read_data=csv_data)()
    mock_add = mocker.patch("dtaas_services.pkg.services.mongodb._add_mongodb_user")
    mock_add.return_value = (False, "Failed to add user")
    success, error = create_users_from_credentials(mock_file, mock_add)
    assert success is False
    assert "Failed to add user" in error
    assert mock_add.call_count == 1


def test_setup_mongodb_users_success(mocker):
    """Test setup_mongodb_users returns success"""
    mocker.patch(
        "dtaas_services.pkg.services.mongodb.process_credentials_file",
        return_value=(True, "MongoDB users created successfully"),
    )
    success, msg = setup_mongodb_users()
    assert success is True
    assert "MongoDB users created successfully" in msg


def test_setup_mongodb_users_missing_credentials(mocker):
    """Test setup_mongodb_users when credentials file is missing"""
    mocker.patch(
        "dtaas_services.pkg.services.mongodb.process_credentials_file",
        return_value=(False, "Credentials file not found"),
    )
    success, msg = setup_mongodb_users()
    assert success is False
    assert "Credentials file not found" in msg


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
