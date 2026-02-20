"""Tests for ThingsBoard user provisioning and credentials processing."""

from pathlib import Path
from unittest.mock import Mock, mock_open
import dtaas_services.pkg.services.thingsboard.setup as th
# pylint: disable=W0212, W0621

# Test constants (not real credentials, for testing only)
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""


def test_process_credentials_row_success(mocker):
    """Test credentials row processing - success scenario"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.create_tenant_and_admin",
        return_value=(True, ""),
    )
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_EMAIL,
    }
    success, _ = th._process_credentials_row(ctx, cred)
    assert success is True


def test_process_credentials_row_missing_email():
    """Test credentials row processing - missing email"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_INVALID_EMAIL,
    }
    success, error = th._process_credentials_row(ctx, cred)
    assert success is False
    assert "Email field is required" in error


def test_process_credentials_row_duplicate_email():
    """Test credentials row processing - duplicate email"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    ctx.seen_emails.add(TEST_EMAIL)
    cred = {"username": TEST_USERNAME, "password": TEST_PASSWORD, "email": TEST_EMAIL}
    success, error = th._process_credentials_row(ctx, cred)
    assert success is False
    assert "Duplicate email" in error


def test_process_credentials_row_creation_fails(mocker):
    """Test credentials row processing - creation fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.create_tenant_and_admin",
        return_value=(False, "error"),
    )
    cred = {
        "username": "user",
        "password": "pass",  # noqa: S105 # NOSONAR
        "email": "test@ex.com",
    }
    success, _ = th._process_credentials_row(ctx, cred)
    assert success is False


def test_process_credentials_file_success(mocker):
    """Test credentials file processing - success scenario"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_row",
        return_value=(True, ""),
    )
    success, _ = th._process_credentials_file(
        base_url, session, Path("/test/creds.csv")
    )
    assert success is True


def test_process_credentials_file_row_fails(mocker):
    """Test credentials file processing - row fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_row",
        return_value=(False, "error"),
    )
    success, _ = th._process_credentials_file(
        base_url, session, Path("/test/creds.csv")
    )
    assert success is False


def test_setup_thingsboard_users_file_not_found(mocker):
    """Test ThingsBoard users setup - file not found"""
    mocker.patch("pathlib.Path.exists", return_value=False)
    success, msg = th.setup_thingsboard_users()
    assert success is False
    assert "not found" in msg


def test_setup_thingsboard_users_success(mocker):
    """Test ThingsBoard users setup - success"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("httpx.Client")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.authenticate_session",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_file",
        return_value=(True, ""),
    )
    success, _ = th.setup_thingsboard_users()
    assert success is True


def test_setup_thingsboard_users_password_fails(mocker):
    """Test ThingsBoard users setup - authentication fails"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("httpx.Client")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.authenticate_session",
        return_value=(False, "auth error"),
    )
    success, _ = th.setup_thingsboard_users()
    assert success is False


def test_setup_thingsboard_users_process_fails(mocker):
    """Test ThingsBoard users setup - process credentials fails"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("httpx.Client")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.authenticate_session",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_file",
        return_value=(False, "error"),
    )
    success, _ = th.setup_thingsboard_users()
    assert success is False


def test_process_credentials_file_no_email_column(mocker):
    """Test _process_credentials_file with missing email column"""
    session = Mock()
    csv_data = "username,password\nuser1,pass1\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    success, msg = th._process_credentials_file(
        "https://localhost:8080", session, Path("/test/creds.csv")
    )
    assert success is False
    assert "Email column is required" in msg


def test_thingsboard_configure_success(mocker):
    """Test thingsboard_configure on success"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.setup_thingsboard_users",
        return_value=(True, "Users created successfully"),
    )
    success, msg = th.thingsboard_configure()
    assert success is True
    assert "Users created" in msg


def test_thingsboard_configure_failure(mocker):
    """Test thingsboard_configure on failure"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.setup_thingsboard_users",
        return_value=(False, "Connection refused"),
    )
    success, msg = th.thingsboard_configure()
    assert success is False
    assert "Error" in msg


def test_setup_thingsboard_users_os_error(mocker):
    """Test setup_thingsboard_users handles OSError from _setup_helper_certs"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._setup_helper_certs",
        side_effect=OSError("disk error"),
    )
    success, msg = th.setup_thingsboard_users()
    assert success is False
    assert "Error" in msg
