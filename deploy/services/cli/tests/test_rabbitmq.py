# pylint: disable=redefined-outer-name
# pylint: disable=W0613
"""Tests for RabbitMQ user management"""

from pathlib import Path
from unittest.mock import patch, Mock, mock_open
import pytest
from dtaas_services.pkg.rabbitmq import (
    _add_rabbitmq_user,
    setup_rabbitmq_users,
    permissions_rabbitmq,
)
from dtaas_services.pkg.utils import create_users_from_credentials


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.rabbitmq.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "RABBIT_UID": "999",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


@pytest.fixture
def mock_process_credentials():
    """Mock process credentials file utility"""
    with patch("dtaas_services.pkg.rabbitmq.process_credentials_file") as mock:
        yield mock


def test_add_rabbitmq_user_success():
    """Test successful RabbitMQ user addition"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        mock_exec.return_value = (True, "success")
        success, error = _add_rabbitmq_user("testuser", "testpass")
        assert success is True
        assert error == ""
        # 1 add_user + 1 add_vhost + 1 set_permissions = 3 calls
        assert mock_exec.call_count == 3


def test_add_rabbitmq_user_add_user_fails():
    """Test RabbitMQ user addition when add_user fails"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        mock_exec.return_value = (False, "user exists")
        success, error = _add_rabbitmq_user("testuser", "testpass")
        assert success is False
        assert "Failed to add user testuser" in error
        assert mock_exec.call_count == 2


def test_add_rabbitmq_user_add_vhost_fails():
    """Test RabbitMQ user addition when add_vhost fails"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        # First call (add_user) succeeds, next 2 (add_vhost with retry) fail
        mock_exec.side_effect = [
            (True, "success"),  # add_user succeeds
            (False, "vhost error"),  # add_vhost attempt 1
            (False, "vhost error"),  # add_vhost attempt 2
        ]
        success, error = _add_rabbitmq_user("testuser", "testpass")
        assert success is False
        assert "Failed to add vhost testuser" in error
        # 1 successful add_user + 2 failed add_vhost retries
        assert mock_exec.call_count == 3


def test_add_rabbitmq_user_set_permissions_fails():
    """Test RabbitMQ user addition when set_permissions fails"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        # First two succeed, third (set_permissions) fails
        mock_exec.side_effect = [
            (True, "success"),
            (True, "success"),
            (False, "permission error"),
        ]
        success, error = _add_rabbitmq_user("testuser", "testpass")
        assert success is False
        assert "Failed to set permissions on vhost testuser" in error
        assert mock_exec.call_count == 3


def test_create_users_from_credentials_success():
    """Test creating users from credentials file"""
    csv_data = "username,password\nuser1,pass1\nuser2,pass2\n"
    mock_file = mock_open(read_data=csv_data)()

    with patch("dtaas_services.pkg.rabbitmq._add_rabbitmq_user") as mock_add:
        mock_add.return_value = (True, "")
        success, error = create_users_from_credentials(mock_file, mock_add)
        assert success is True
        assert error == ""
        assert mock_add.call_count == 2


def test_create_users_from_credentials_failure():
    """Test creating users from credentials when user creation fails"""
    csv_data = "username,password\nuser1,pass1\nuser2,pass2\n"
    mock_file = mock_open(read_data=csv_data)()

    with patch("dtaas_services.pkg.rabbitmq._add_rabbitmq_user") as mock_add:
        mock_add.return_value = (False, "Failed to add user")
        success, error = create_users_from_credentials(mock_file, mock_add)
        assert success is False
        assert "Failed to add user" in error
        # Should stop after first failure
        assert mock_add.call_count == 1


def test_setup_rabbitmq_users_success(mock_process_credentials):
    """Test successful RabbitMQ users setup"""
    mock_process_credentials.return_value = (
        True,
        "RabbitMQ users created successfully",
    )
    success, message = setup_rabbitmq_users()
    assert success is True
    assert "RabbitMQ users created successfully" in message


def test_setup_rabbitmq_users_file_not_found(mock_process_credentials):
    """Test RabbitMQ users setup when credentials file not found"""
    mock_process_credentials.return_value = (
        False,
        "Credentials file not found: /test/config/credentials.csv",
    )
    success, message = setup_rabbitmq_users()
    assert success is False
    assert "Credentials file not found" in message


def test_setup_rabbitmq_users_creation_fails(mock_process_credentials):
    """Test RabbitMQ users setup when user creation fails"""
    mock_process_credentials.return_value = (False, "Creation failed")
    success, message = setup_rabbitmq_users()
    assert success is False
    assert "Creation failed" in message


def test_setup_rabbitmq_users_os_error(mock_process_credentials):
    """Test RabbitMQ users setup with OSError"""
    mock_process_credentials.return_value = (
        False,
        "Error adding RabbitMQ users: File error",
    )
    success, message = setup_rabbitmq_users()
    assert success is False
    assert "Error adding RabbitMQ users" in message


def test_setup_rabbitmq_users_key_error(mock_process_credentials):
    """Test RabbitMQ users setup with KeyError"""
    mock_process_credentials.return_value = (
        False,
        "Error adding RabbitMQ users: 'username'",
    )
    success, message = setup_rabbitmq_users()
    assert success is False
    assert "Error adding RabbitMQ users" in message


def test_permissions_rabbitmq_success_linux(mock_config):
    """Test successful RabbitMQ permissions setup on Linux"""
    with patch("dtaas_services.pkg.rabbitmq.Config") as mock_cfg, patch(
        "dtaas_services.pkg.rabbitmq.set_service_cert_permissions",
        return_value=(True, "privkey set"),
    ), patch("pathlib.Path.exists", return_value=True):
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "RABBIT_UID": "999",
        }.get(key, "default")
        mock_cfg.return_value = mock_instance
        mock_cfg.get_base_dir.return_value = Path("/test/base")

        with patch("shutil.copy2"):
            success, _ = permissions_rabbitmq()
            assert success is True


def test_permissions_rabbitmq_success_darwin(mock_config):
    """Test successful RabbitMQ permissions setup on Darwin"""
    with patch("dtaas_services.pkg.rabbitmq.Config") as mock_cfg, patch(
        "dtaas_services.pkg.rabbitmq.set_service_cert_permissions",
        return_value=(True, "privkey set"),
    ), patch("pathlib.Path.exists", return_value=True):
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "RABBIT_UID": "999",
        }.get(key, "default")
        mock_cfg.return_value = mock_instance
        mock_cfg.get_base_dir.return_value = Path("/test/base")

        with patch("shutil.copy2"):
            success, _ = permissions_rabbitmq()
            assert success is True


def test_permissions_rabbitmq_success_windows(mock_config):
    """Test successful RabbitMQ permissions setup on Windows"""
    with patch("dtaas_services.pkg.rabbitmq.Config") as mock_cfg, patch(
        "dtaas_services.pkg.rabbitmq.set_service_cert_permissions",
        return_value=(True, "privkey set"),
    ), patch("pathlib.Path.exists", return_value=True):
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "RABBIT_UID": "999",
        }.get(key, "default")
        mock_cfg.return_value = mock_instance
        mock_cfg.get_base_dir.return_value = Path("/test/base")

        with patch("shutil.copy2"):
            success, _ = permissions_rabbitmq()
            assert success is True


def test_permissions_rabbitmq_success_ci(mock_config):
    """Test RabbitMQ permissions setup in CI environment"""
    with patch("dtaas_services.pkg.rabbitmq.Config") as mock_cfg, patch(
        "dtaas_services.pkg.rabbitmq.set_service_cert_permissions",
        return_value=(True, "privkey set (skipped)"),
    ), patch("pathlib.Path.exists", return_value=True):
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "RABBIT_UID": "999",
        }.get(key, "default")
        mock_cfg.return_value = mock_instance
        mock_cfg.get_base_dir.return_value = Path("/test/base")

        with patch("shutil.copy2"):
            success, _ = permissions_rabbitmq()
            assert success is True


def test_permissions_rabbitmq_os_error(mock_config):
    """Test RabbitMQ permissions setup with OSError"""
    with patch("platform.system", return_value="Linux"), patch(
        "pathlib.Path.exists", return_value=True
    ), patch("shutil.copy2", side_effect=OSError("Copy failed")):
        success, message = permissions_rabbitmq()
        assert success is False
        assert "Error setting permissions for RabbitMQ" in message
