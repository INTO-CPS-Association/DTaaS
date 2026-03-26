"""Tests for ThingsBoard credential file processing."""

from pathlib import Path
from unittest.mock import Mock, mock_open
import dtaas_services.pkg.services.thingsboard.setup_credentials as creds
from dtaas_services.pkg.services.thingsboard.tb_cert import CredentialProcessContext
# pylint: disable=W0212, W0621

TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""


def test_process_credentials_row_success(mocker):
    """Test credentials row processing success scenario"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = CredentialProcessContext(base_url, session)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup_credentials.create_customer_and_user",
        return_value=(True, ""),
    )
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_EMAIL,
    }
    success, _ = creds._process_credentials_row(ctx, cred)
    assert success is True


def test_process_credentials_row_missing_email():
    """Test credentials row processing missing email"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = CredentialProcessContext(base_url, session)
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_INVALID_EMAIL,
    }
    success, error = creds._process_credentials_row(ctx, cred)
    assert success is False
    assert "Email field is required" in error


def test_process_credentials_file_success(mocker):
    """Test credentials file processing success scenario"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup_credentials._process_credentials_row",
        return_value=(True, ""),
    )
    success, _ = creds.process_credentials_file(
        base_url, session, Path("/test/creds.csv")
    )
    assert success is True


def test_process_credentials_file_row_fails(mocker):
    """Test credentials file processing row fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup_credentials._process_credentials_row",
        return_value=(False, "error"),
    )
    success, _ = creds.process_credentials_file(
        base_url, session, Path("/test/creds.csv")
    )
    assert success is False


def test_process_credentials_file_no_email_column(mocker):
    """Test process_credentials_file with missing email column"""
    session = Mock()
    csv_data = "username,password\nuser1,pass1\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    success, msg = creds.process_credentials_file(
        "https://localhost:8080", session, Path("/test/creds.csv")
    )
    assert success is False
    assert "Email column is required" in msg
