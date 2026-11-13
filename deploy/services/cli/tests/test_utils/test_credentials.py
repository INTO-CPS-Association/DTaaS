"""Tests for the credentials file helpers of utils.py."""

from pathlib import Path
from unittest.mock import mock_open
from dtaas_services.pkg.utils import (
    create_users_from_credentials,
    get_credentials_path,
    process_credentials_file,
)
# pylint: disable=W0613

# Test fixture constants (not real credentials)
TEST_USER_1 = "testuser1"  # noqa: S105
TEST_USER_2 = "testuser2"  # noqa: S105
TEST_PASS_1 = "testpass1"  # noqa: S105
TEST_PASS_2 = "testpass2"  # noqa: S105


def test_get_credentials_path(mocker):
    """Test getting credentials path"""
    mock_get_base_dir = mocker.patch("dtaas_services.pkg.utils.Config.get_base_dir")
    mock_get_base_dir.return_value = Path("/path/to/base")
    path = get_credentials_path()
    assert path == Path("/path/to/base") / "config" / "credentials.csv"


def test_process_credentials_file_success(mocker):
    """Test successful credentials file processing"""
    mock_get_path = mocker.patch("dtaas_services.pkg.utils.get_credentials_path")
    mock_path = Path("/path/to/credentials.csv")
    mock_get_path.return_value = mock_path

    def mock_process(_creds_file):
        return True, ""

    mocker.patch("dtaas_services.pkg.utils.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.utils.Path.open",
        mock_open(read_data="username,password\n"),
    )
    success, msg = process_credentials_file(
        mock_process, "test_service", "Success message"
    )
    assert success is True
    assert msg == "Success message"


def test_process_credentials_file_not_found(mocker):
    """Test when credentials file does not exist"""
    mock_get_path = mocker.patch("dtaas_services.pkg.utils.get_credentials_path")
    mock_path = Path("/path/to/credentials.csv")
    mock_get_path.return_value = mock_path

    def mock_process():
        return True, ""

    mocker.patch("dtaas_services.pkg.utils.Path.exists", return_value=False)
    success, msg = process_credentials_file(
        mock_process, "test_service", "Success message"
    )
    assert success is False
    assert "Credentials file not found" in msg


def test_process_credentials_file_os_error(mocker):
    """Test when file operation raises OSError"""
    mock_get_path = mocker.patch("dtaas_services.pkg.utils.get_credentials_path")
    mock_path = Path("/path/to/credentials.csv")
    mock_get_path.return_value = mock_path

    def mock_process():
        return True, ""

    mocker.patch("dtaas_services.pkg.utils.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.utils.Path.open", side_effect=OSError("Read error")
    )
    success, msg = process_credentials_file(
        mock_process, "test_service", "Success message"
    )
    assert success is False
    assert "Error adding test_service users" in msg


def test_create_users_from_credentials_success(mocker):
    """Test successful user creation from credentials"""
    csv_content = "username,password\nuser1,pass1\nuser2,pass2"
    mock_file = mock_open(read_data=csv_content)

    call_count = 0

    def mock_user_creation(username, password):  # noqa: ARG001
        nonlocal call_count
        call_count += 1
        return True, ""

    mock_dictreader = mocker.patch("dtaas_services.pkg.utils.csv.DictReader")
    mock_dictreader.return_value = [
        {"username": TEST_USER_1, "password": TEST_PASS_1},
        {"username": TEST_USER_2, "password": TEST_PASS_2},
    ]
    success, error_msg = create_users_from_credentials(mock_file(), mock_user_creation)
    assert success is True
    assert error_msg == ""
    assert call_count == 2


def test_create_users_from_credentials_failure(mocker):
    """Test user creation failure"""
    csv_content = "username,password\nuser1,pass1"
    mock_file = mock_open(read_data=csv_content)

    def mock_user_creation(username, password):  # noqa: ARG001
        if username == TEST_USER_1:
            return False, "User creation failed"
        return True, ""

    mock_dictreader = mocker.patch("dtaas_services.pkg.utils.csv.DictReader")
    mock_dictreader.return_value = [
        {"username": TEST_USER_1, "password": TEST_PASS_1},
    ]
    success, error_msg = create_users_from_credentials(mock_file(), mock_user_creation)
    assert success is False
    assert error_msg == "User creation failed"
