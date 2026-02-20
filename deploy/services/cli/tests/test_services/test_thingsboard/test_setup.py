"""Tests for ThingsBoard admin user management functions."""

from pathlib import Path
from unittest.mock import patch, Mock, mock_open
import dtaas_services.pkg.services.thingsboard.setup as th
# pylint: disable=W0212, W0621

# Test constants (not real credentials, for testing only)
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""


def test_process_credentials_row_scenarios():
    """Test credentials row processing with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    # Success
    with patch(
        "dtaas_services.pkg.services.thingsboard.setup.create_tenant_and_admin",
        return_value=(True, ""),
    ):
        cred = {
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD,
            "email": TEST_EMAIL,
        }
        success, _ = th._process_credentials_row(ctx, cred)
        assert success is True
    # No email
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_INVALID_EMAIL,
    }
    success, error = th._process_credentials_row(ctx, cred)
    assert success is False
    assert "Email field is required" in error
    # Duplicate email
    ctx.seen_emails.add(TEST_EMAIL)
    cred = {"username": TEST_USERNAME, "password": TEST_PASSWORD, "email": TEST_EMAIL}
    success, error = th._process_credentials_row(ctx, cred)
    assert success is False
    assert "Duplicate email" in error
    # Creation fails
    ctx2 = th.CredentialProcessContext(base_url, session)
    with patch(
        "dtaas_services.pkg.services.thingsboard.setup.create_tenant_and_admin",
        return_value=(False, "error"),
    ):
        cred = {
            "username": "user",
            "password": "pass",  # noqa: S105 # NOSONAR
            "email": "test@ex.com",
        }
        success, _ = th._process_credentials_row(ctx2, cred)
        assert success is False


def test_process_credentials_file_scenarios():
    """Test credentials file processing with scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    # Success
    with patch("pathlib.Path.open", mock_open(read_data=csv_data)), patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_row",
        return_value=(True, ""),
    ):
        success, _ = th._process_credentials_file(
            base_url, session, Path("/test/creds.csv")
        )
        assert success is True
    # Row fails
    with patch("pathlib.Path.open", mock_open(read_data=csv_data)), patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_row",
        return_value=(False, "error"),
    ):
        success, _ = th._process_credentials_file(
            base_url, session, Path("/test/creds.csv")
        )
        assert success is False


def test_setup_thingsboard_users_scenarios():
    """Test ThingsBoard users setup with multiple scenarios"""
    # File not found
    with patch("pathlib.Path.exists", return_value=False):
        success, msg = th.setup_thingsboard_users()
        assert success is False
        assert "not found" in msg
    # Success
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    ), patch("httpx.Client"), patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_sysadmin_password_if_needed",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_file",
        return_value=(True, ""),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is True
    # Password change fails
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    ), patch("httpx.Client"), patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_sysadmin_password_if_needed",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
    # Process fails
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    ), patch("httpx.Client"), patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_sysadmin_password_if_needed",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_file",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False


def test_process_credentials_file_no_email_column():
    """Test _process_credentials_file with missing email column"""
    session = Mock()
    csv_data = "username,password\nuser1,pass1\n"
    with patch("pathlib.Path.open", mock_open(read_data=csv_data)):
        success, msg = th._process_credentials_file(
            "https://localhost:8080", session, Path("/test/creds.csv")
        )
    assert success is False
    assert "Email column is required" in msg


def test_change_password_with_logging_success():
    """Test _change_password_with_logging suppresses logging"""
    session = Mock()
    with patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_sysadmin_password_if_needed",
        return_value=(True, "Password changed"),
    ):
        success, _ = th._change_password_with_logging(
            "https://localhost:8080", session, "newpass"
        )
    assert success is True


def test_handle_password_change_result_recoverable_error():
    """Test _handle_password_change_result with recoverable error"""
    should_continue, error = th._handle_password_change_result(
        False, "Server not reachable"
    )
    assert should_continue is True
    assert error is None


def test_handle_password_change_result_fatal_error():
    """Test _handle_password_change_result with fatal error"""
    should_continue, error = th._handle_password_change_result(
        False, "Invalid credentials format"
    )
    assert should_continue is False
    assert error is not None


def test_handle_password_setup_with_password():
    """Test _handle_password_setup with password"""
    session = Mock()
    with patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_password_with_logging",
        return_value=(True, "Changed"),
    ):
        should_continue, _ = th._handle_password_setup(
            "https://localhost:8080", session, "newpass"
        )
    assert should_continue is True


def test_setup_helper_certs_value_error():
    """Test _setup_helper_certs handles ValueError"""
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    ), patch(
        "dtaas_services.pkg.services.thingsboard.setup._create_session",
        side_effect=ValueError("Bad config"),
    ):
        success, msg = th._setup_helper_certs(Path("/test/creds.csv"))
    assert success is False
    assert "Error" in msg


def test_thingsboard_configure_success():
    """Test thingsboard_configure on success"""
    with patch(
        "dtaas_services.pkg.services.thingsboard.setup.setup_thingsboard_users",
        return_value=(True, "Users created successfully"),
    ):
        success, msg = th.thingsboard_configure()
    assert success is True
    assert "Users created" in msg


def test_thingsboard_configure_failure():
    """Test thingsboard_configure on failure"""
    with patch(
        "dtaas_services.pkg.services.thingsboard.setup.setup_thingsboard_users",
        return_value=(False, "Connection refused"),
    ):
        success, msg = th.thingsboard_configure()
    assert success is False
    assert "Error" in msg
