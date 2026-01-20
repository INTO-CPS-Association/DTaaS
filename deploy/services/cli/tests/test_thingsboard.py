# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard admin user management functions."""

from pathlib import Path
from unittest.mock import patch, Mock, mock_open
import pytest
import requests
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


# Admin User Tests
@pytest.mark.parametrize(
    "login_token,expected",
    [
        ("token123", True),
        (None, False),
    ],
)
def test_check_admin_exists(login_token, expected):
    """Test checking if admin exists"""
    with patch("dtaas_services.pkg.thingsboard.login", return_value=login_token):
        result = th._check_admin_exists(
            "https://localhost:8080", "admin@ex.com", "pass"
        )
        assert result == expected


def test_create_tenant_admin_user_scenarios():
    """Test tenant admin user creation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = "password"
    # Success
    session.post.return_value = Mock(
        status_code=200, json=lambda: {"id": {"id": "user123"}}
    )
    user_id, error = th._create_tenant_admin_user(ctx, "tenant")
    assert user_id == "user123"
    assert error == ""
    # Failure
    session.post.return_value = Mock(status_code=400, text="Error")
    user_id, error = th._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert error != ""
    # JSON error
    session.post.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=requests.exceptions.JSONDecodeError("err", "doc", 0)),
    )
    user_id, error = th._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert error != ""


def test_get_activation_token_scenarios():
    """Test activation token retrieval with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    # Success
    session.get.return_value = Mock(status_code=200, text="link?activateToken=token123")
    token, error = th._get_activation_token(base_url, session, "user123")
    assert token == "token123"
    assert error == ""
    # No token
    session.get.return_value = Mock(status_code=200, text="no token")
    token, error = th._get_activation_token(base_url, session, "user123")
    assert token is None
    assert error != ""
    # Exception
    session.get.side_effect = requests.exceptions.RequestException("Error")
    token, error = th._get_activation_token(base_url, session, "user123")
    assert token is None
    assert error != ""


def test_activate_user_scenarios():
    """Test user activation with multiple scenarios"""
    base_url = "https://localhost:8080"
    # Success
    with patch("requests.post", return_value=Mock(status_code=200)):
        success, _ = th._activate_user(base_url, "token", "pass")
        assert success is True
    # Failure
    with patch("requests.post", return_value=Mock(status_code=400, text="Error")):
        success, _ = th._activate_user(base_url, "token", "pass")
        assert success is False
    # Exception
    with patch(
        "requests.post", side_effect=requests.exceptions.RequestException("Error")
    ):
        success, _ = th._activate_user(base_url, "token", "pass")
        assert success is False


@pytest.mark.parametrize(
    "login_token,expected_success",
    [
        ("token123", True),
        (None, False),
    ],
)
def test_verify_admin_login(login_token, expected_success):
    """Test admin login verification"""
    with patch("dtaas_services.pkg.thingsboard.login", return_value=login_token):
        success, _ = th._verify_admin_login(
            "https://localhost:8080", "admin@ex.com", "pass"
        )
        assert success == expected_success


def test_create_and_activate_admin_scenarios():
    """Test admin creation and activation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    # Full success
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=("user123", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._activate_user", return_value=(True, "")
    ), patch(
        "dtaas_services.pkg.thingsboard._verify_admin_login", return_value=(True, "")
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is True
    # Create fails
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=(None, "error"),
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Get token fails
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._get_activation_token",
        return_value=(None, "error"),
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Activate fails
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._activate_user", return_value=(False, "error")
    ):
        success, _ = th._create_and_activate_admin(ctx, "tenant")
        assert success is False


def test_ensure_tenant_admin_scenarios():
    """Test ensuring tenant admin with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    tenant = {"id": {"id": "tenant123"}}
    # Already exists
    with patch("dtaas_services.pkg.thingsboard._check_admin_exists", return_value=True):
        success, _ = th._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Create new
    with patch(
        "dtaas_services.pkg.thingsboard._check_admin_exists", return_value=False
    ), patch(
        "dtaas_services.pkg.thingsboard._create_and_activate_admin",
        return_value=(True, ""),
    ):
        success, _ = th._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Exception
    with patch(
        "dtaas_services.pkg.thingsboard._check_admin_exists",
        side_effect=Exception("Error"),
    ):
        success, _ = th._ensure_tenant_admin(ctx, tenant)
        assert success is False


def test_create_tenant_and_admin_scenarios():
    """Test tenant and admin creation with scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    tenant = {"id": {"id": "123"}}
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard.get_or_create_tenant",
        return_value=(tenant, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._ensure_tenant_admin", return_value=(True, "")
    ):
        ctx = th._TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th._AdminCredentials("admin@ex.com", "pass")
        success, _ = th._create_tenant_and_admin(ctx)
        assert success is True
    # Tenant creation fails
    with patch(
        "dtaas_services.pkg.thingsboard.get_or_create_tenant",
        return_value=(None, "error"),
    ):
        ctx = th._TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th._AdminCredentials("admin@ex.com", "pass")
        success, _ = th._create_tenant_and_admin(ctx)
        assert success is False


# Credentials Processing Tests
def test_process_credentials_row_scenarios():
    """Test credentials row processing with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th._CredentialProcessContext(base_url, session)
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_and_admin",
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
    ctx2 = th._CredentialProcessContext(base_url, session)
    with patch(
        "dtaas_services.pkg.thingsboard._create_tenant_and_admin",
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
    ), patch("requests.Session"), patch(
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
    ), patch("requests.Session"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
    # Process fails
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url",
        return_value="https://localhost:8080",
    ), patch("requests.Session"), patch(
        "dtaas_services.pkg.thingsboard.change_sysadmin_password_if_needed",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard._process_credentials_file",
        return_value=(False, "error"),
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
    # Exception
    with patch("pathlib.Path.exists", return_value=True), patch(
        "dtaas_services.pkg.thingsboard.build_base_url", side_effect=OSError("Error")
    ):
        success, _ = th.setup_thingsboard_users()
        assert success is False
