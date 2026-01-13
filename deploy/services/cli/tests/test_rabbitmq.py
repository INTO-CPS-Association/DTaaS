# pylint: disable=redefined-outer-name
"""Tests for RabbitMQ user management"""

from pathlib import Path
from unittest.mock import patch, Mock, mock_open
import pytest
from dtaas_services.pkg.rabbitmq import (
    _execute_rabbitmq_command,
    _add_rabbitmq_user,
    _create_users_from_credentials,
    setup_rabbitmq_users,
    permissions_rabbitmq,
)


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
def mock_credentials_path():
    """Mock credentials path"""
    with patch("dtaas_services.pkg.rabbitmq.get_credentials_path") as mock:
        mock.return_value = Path("/test/config/credentials.csv")
        yield mock


def test_execute_rabbitmq_command_success():
    """Test successful RabbitMQ command execution"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        mock_exec.return_value = (True, "success output")
        success, error = _execute_rabbitmq_command(
            "rabbitmq", ["rabbitmqctl", "list_users"], "Failed to list users"
        )
        assert success is True
        assert error == ""
        mock_exec.assert_called_once_with("rabbitmq", ["rabbitmqctl", "list_users"])


def test_execute_rabbitmq_command_failure():
    """Test failed RabbitMQ command execution"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        mock_exec.return_value = (False, "command failed")
        success, error = _execute_rabbitmq_command(
            "rabbitmq", ["rabbitmqctl", "list_users"], "Failed to list users"
        )
        assert success is False
        assert "Failed to list users" in error
        assert "command failed" in error


def test_add_rabbitmq_user_success():
    """Test successful RabbitMQ user addition"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        mock_exec.return_value = (True, "success")
        success, error = _add_rabbitmq_user("testuser", "testpass")
        assert success is True
        assert error == ""
        # Verify all three commands were called
        assert mock_exec.call_count == 3


def test_add_rabbitmq_user_add_user_fails():
    """Test RabbitMQ user addition when add_user fails"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        mock_exec.return_value = (False, "user exists")
        success, error = _add_rabbitmq_user("testuser", "testpass")
        assert success is False
        assert "Failed to add user testuser" in error
        # Should only call once before returning
        assert mock_exec.call_count == 1


def test_add_rabbitmq_user_add_vhost_fails():
    """Test RabbitMQ user addition when add_vhost fails"""
    with patch("dtaas_services.pkg.rabbitmq.execute_docker_command") as mock_exec:
        # First call (add_user) succeeds, second (add_vhost) fails
        mock_exec.side_effect = [(True, "success"), (False, "vhost error")]
        success, error = _add_rabbitmq_user("testuser", "testpass")
        assert success is False
        assert "Failed to add vhost testuser" in error
        assert mock_exec.call_count == 2


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
        success, error = _create_users_from_credentials(mock_file)
        assert success is True
        assert error == ""
        assert mock_add.call_count == 2


def test_create_users_from_credentials_failure():
    """Test creating users from credentials when user creation fails"""
    csv_data = "username,password\nuser1,pass1\nuser2,pass2\n"
    mock_file = mock_open(read_data=csv_data)()

    with patch("dtaas_services.pkg.rabbitmq._add_rabbitmq_user") as mock_add:
        mock_add.return_value = (False, "Failed to add user")
        success, error = _create_users_from_credentials(mock_file)
        assert success is False
        assert "Failed to add user" in error
        # Should stop after first failure
        assert mock_add.call_count == 1


def test_setup_rabbitmq_users_success(mock_credentials_path):
    """Test successful RabbitMQ users setup"""
    csv_data = "username,password\nuser1,pass1\n"

    with patch("pathlib.Path.exists", return_value=True), patch(
        "pathlib.Path.open", mock_open(read_data=csv_data)
    ), patch(
        "dtaas_services.pkg.rabbitmq._create_users_from_credentials"
    ) as mock_create:
        mock_create.return_value = (True, "")
        success, message = setup_rabbitmq_users()
        assert success is True
        assert "RabbitMQ users created successfully" in message


def test_setup_rabbitmq_users_file_not_found(mock_credentials_path):
    """Test RabbitMQ users setup when credentials file not found"""
    with patch("pathlib.Path.exists", return_value=False):
        success, message = setup_rabbitmq_users()
        assert success is False
        assert "Credentials file not found" in message


def test_setup_rabbitmq_users_creation_fails(mock_credentials_path):
    """Test RabbitMQ users setup when user creation fails"""
    csv_data = "username,password\nuser1,pass1\n"

    with patch("pathlib.Path.exists", return_value=True), patch(
        "pathlib.Path.open", mock_open(read_data=csv_data)
    ), patch(
        "dtaas_services.pkg.rabbitmq._create_users_from_credentials"
    ) as mock_create:
        mock_create.return_value = (False, "Creation failed")
        success, message = setup_rabbitmq_users()
        assert success is False
        assert "Creation failed" in message


def test_setup_rabbitmq_users_os_error(mock_credentials_path):
    """Test RabbitMQ users setup with OSError"""
    with patch("pathlib.Path.exists", return_value=True), patch(
        "pathlib.Path.open", side_effect=OSError("File error")
    ):
        success, message = setup_rabbitmq_users()
        assert success is False
        assert "Error adding RabbitMQ users" in message


def test_setup_rabbitmq_users_key_error(mock_credentials_path):
    """Test RabbitMQ users setup with KeyError"""
    csv_data = "wrongcolumn,data\nvalue1,value2\n"

    with patch("pathlib.Path.exists", return_value=True), patch(
        "pathlib.Path.open", mock_open(read_data=csv_data)
    ):
        success, message = setup_rabbitmq_users()
        assert success is False
        assert "Error adding RabbitMQ users" in message


def test_permissions_rabbitmq_success_linux(mock_config):
    """Test successful RabbitMQ permissions setup on Linux"""
    with patch("platform.system", return_value="Linux"), patch(
        "shutil.copy2"
    ) as mock_copy, patch("shutil.chown") as mock_chown, patch(
        "dtaas_services.pkg.rabbitmq.is_ci", return_value=False
    ):
        success, message = permissions_rabbitmq()
        assert success is True
        assert "created and ownership set" in message
        mock_copy.assert_called_once()
        mock_chown.assert_called_once()


def test_permissions_rabbitmq_success_darwin(mock_config):
    """Test successful RabbitMQ permissions setup on Darwin"""
    with patch("platform.system", return_value="Darwin"), patch(
        "shutil.copy2"
    ) as mock_copy, patch("shutil.chown") as mock_chown, patch(
        "dtaas_services.pkg.rabbitmq.is_ci", return_value=False
    ):
        success, message = permissions_rabbitmq()
        assert success is True
        assert "created and ownership set" in message
        mock_copy.assert_called_once()
        mock_chown.assert_called_once()


def test_permissions_rabbitmq_success_windows(mock_config):
    """Test successful RabbitMQ permissions setup on Windows"""
    with patch("platform.system", return_value="Windows"), patch(
        "shutil.copy2"
    ) as mock_copy, patch("shutil.chown") as mock_chown, patch(
        "dtaas_services.pkg.rabbitmq.is_ci", return_value=False
    ):
        success, message = permissions_rabbitmq()
        assert success is True
        assert "created" in message
        mock_copy.assert_called_once()
        # chown should not be called on Windows
        mock_chown.assert_not_called()


def test_permissions_rabbitmq_success_ci(mock_config):
    """Test RabbitMQ permissions setup in CI environment"""
    with patch("platform.system", return_value="Linux"), patch(
        "shutil.copy2"
    ) as mock_copy, patch("shutil.chown") as mock_chown, patch(
        "dtaas_services.pkg.rabbitmq.is_ci", return_value=True
    ):
        success, message = permissions_rabbitmq()
        assert success is True
        assert "permission changes skipped in CI" in message
        mock_copy.assert_called_once()
        # chown should not be called in CI
        mock_chown.assert_not_called()


def test_permissions_rabbitmq_os_error(mock_config):
    """Test RabbitMQ permissions setup with OSError"""
    with patch("platform.system", return_value="Linux"), patch(
        "shutil.copy2", side_effect=OSError("Copy failed")
    ):
        success, message = permissions_rabbitmq()
        assert success is False
        assert "Error setting permissions for RabbitMQ" in message
