# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard admin user management functions."""

from pathlib import Path
from unittest.mock import patch, Mock, mock_open
import pytest
import dtaas_services.pkg.thingsboard as th

# Test constants (not real credentials, for testing only)
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.thingsboard.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "POSTGRES_UID": "999",
            "POSTGRES_GID": "999",
            "THINGSBOARD_UID": "1000",
            "THINGSBOARD_GID": "1000",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


# Credentials Processing Tests
def test_process_credentials_row_scenarios():
    """Test credentials row processing with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard.create_tenant_and_admin",
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
        "dtaas_services.pkg.thingsboard.create_tenant_and_admin",
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
        "dtaas_services.pkg.thingsboard._process_credentials_row",
        return_value=(True, ""),
    ):
        success, _ = th._process_credentials_file(
            base_url, session, Path("/test/creds.csv")
        )
        assert success is True
    # Row fails
    with patch("pathlib.Path.open", mock_open(read_data=csv_data)), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_row",
        return_value=(False, "error"),
    ):
        success, _ = th._process_credentials_file(
            base_url, session, Path("/test/creds.csv")
        )
        assert success is False


def test_setup_thingsboard_users_scenarios(mock_config):
    """Test ThingsBoard users setup with multiple scenarios"""
    # File not found
    with patch("pathlib.Path.exists", return_value=False):
        success, msg = th.setup_thingsboard_users()
        assert success is False
        assert "not found" in msg
    # Success
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url",
        return_value="https://localhost:8080",
    ), patch("httpx.Client"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_file",
        return_value=(True, ""),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is True
    # Password change fails
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url",
        return_value="https://localhost:8080",
    ), patch("httpx.Client"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
    # Process fails
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url",
        return_value="https://localhost:8080",
    ), patch("httpx.Client"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_file",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
