# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard utility functions."""

from unittest.mock import patch, Mock
import pytest
import httpx
import dtaas_services.pkg.thingsboard_utility as th_util

# Test constants (not real credentials, for testing only)
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""


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
    with patch(
        "dtaas_services.pkg.thingsboard_utility.login", return_value=login_token
    ):
        result = th_util._check_admin_exists(
            "https://localhost:8080", "admin@ex.com", "pass"
        )
        assert result == expected


def test_create_tenant_admin_user_scenarios():
    """Test tenant admin user creation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = "password"
    # Success
    session.post.return_value = Mock(
        status_code=200, json=lambda: {"id": {"id": "user123"}}
    )
    user_id, error = th_util._create_tenant_admin_user(ctx, "tenant")
    assert user_id == "user123"
    assert error == ""
    # Failure
    session.post.return_value = Mock(
        status_code=400, json=lambda: {"message": "User creation failed"}
    )
    user_id, error = th_util._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert error != ""
    # JSON error
    session.post.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=Exception("JSON error")),
    )
    user_id, error = th_util._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert error != ""


def test_get_activation_token_scenarios():
    """Test activation token retrieval with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    # Success
    session.get.return_value = Mock(status_code=200, text="link?activateToken=token123")
    token, error = th_util._get_activation_token(base_url, session, "user123")
    assert token == "token123"
    assert error == ""
    # No token
    session.get.return_value = Mock(status_code=200, text="no token")
    token, error = th_util._get_activation_token(base_url, session, "user123")
    assert token is None
    assert error != ""
    # Exception
    session.get.side_effect = httpx.HTTPError("Error")
    token, error = th_util._get_activation_token(base_url, session, "user123")
    assert token is None
    assert error != ""


def test_activate_user_scenarios():
    """Test user activation with multiple scenarios"""
    base_url = "https://localhost:8080"
    # Success
    with patch("httpx.post", return_value=Mock(status_code=200)):
        success, _ = th_util._activate_user(base_url, "token", "pass")
        assert success is True
    # Failure
    with patch("httpx.post", return_value=Mock(status_code=400, text="Error")):
        success, _ = th_util._activate_user(base_url, "token", "pass")
        assert success is False
    # Exception
    with patch("httpx.post", side_effect=httpx.HTTPError("Error")):
        success, _ = th_util._activate_user(base_url, "token", "pass")
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
    with patch(
        "dtaas_services.pkg.thingsboard_utility.login", return_value=login_token
    ):
        success, _ = th_util._verify_admin_login(
            "https://localhost:8080", "admin@ex.com", "pass"
        )
        assert success == expected_success


def test_create_and_activate_admin_scenarios():
    """Test admin creation and activation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    # Full success
    with patch(
        "dtaas_services.pkg.thingsboard_utility._create_tenant_admin_user",
        return_value=("user123", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._activate_user", return_value=(True, "")
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._verify_admin_login",
        return_value=(True, ""),
    ):
        success, _ = th_util._create_and_activate_admin(ctx, "tenant")
        assert success is True
    # Create fails
    with patch(
        "dtaas_services.pkg.thingsboard_utility._create_tenant_admin_user",
        return_value=(None, "error"),
    ):
        success, _ = th_util._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Get token fails
    with patch(
        "dtaas_services.pkg.thingsboard_utility._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._get_activation_token",
        return_value=(None, "error"),
    ):
        success, _ = th_util._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Activate fails
    with patch(
        "dtaas_services.pkg.thingsboard_utility._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._activate_user",
        return_value=(False, "error"),
    ):
        success, _ = th_util._create_and_activate_admin(ctx, "tenant")
        assert success is False


def test_ensure_tenant_admin_scenarios():
    """Test ensuring tenant admin with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    tenant = {"id": {"id": "tenant123"}}
    # Already exists
    with patch(
        "dtaas_services.pkg.thingsboard_utility._check_admin_exists", return_value=True
    ):
        success, _ = th_util._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Create new
    with patch(
        "dtaas_services.pkg.thingsboard_utility._check_admin_exists", return_value=False
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._create_and_activate_admin",
        return_value=(True, ""),
    ):
        success, _ = th_util._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Exception
    with patch(
        "dtaas_services.pkg.thingsboard_utility._check_admin_exists",
        side_effect=Exception("Error"),
    ):
        success, _ = th_util._ensure_tenant_admin(ctx, tenant)
        assert success is False


def test_create_tenant_and_admin_scenarios():
    """Test tenant and admin creation with scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    tenant = {"id": {"id": "123"}}
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard_users.get_or_create_tenant",
        return_value=(tenant, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_utility._ensure_tenant_admin",
        return_value=(True, ""),
    ):
        ctx = th_util.TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th_util.AdminCredentials("admin@ex.com", "pass")
        success, _ = th_util.create_tenant_and_admin(ctx)
        assert success is True
    # Tenant creation fails
    with patch(
        "dtaas_services.pkg.thingsboard_users.get_or_create_tenant",
        return_value=(None, "error"),
    ):
        ctx = th_util.TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th_util.AdminCredentials("admin@ex.com", "pass")
        success, _ = th_util.create_tenant_and_admin(ctx)
        assert success is False


def test_validate_credential_row_scenarios():
    """Test credential row validation"""
    seen_emails = set()
    # Valid email
    success, email = th_util.validate_credential_row(
        {"email": TEST_EMAIL}, TEST_USERNAME, seen_emails
    )
    assert success is True
    assert email == TEST_EMAIL
    # Empty email
    success, error = th_util.validate_credential_row(
        {"email": ""}, TEST_USERNAME, seen_emails
    )
    assert success is False
    assert "Email field is required" in error
    # Duplicate email
    seen_emails.add(TEST_EMAIL)
    success, error = th_util.validate_credential_row(
        {"email": TEST_EMAIL}, TEST_USERNAME, seen_emails
    )
    assert success is False
    assert "Duplicate email" in error
