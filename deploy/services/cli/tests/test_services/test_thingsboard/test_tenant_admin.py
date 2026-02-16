# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard utility functions."""

from unittest.mock import patch, Mock
import pytest
import httpx
import dtaas_services.pkg.services.thingsboard.tenant_admin as th_util

# Test constants (not real credentials, for testing only)
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""


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
        "dtaas_services.pkg.services.thingsboard.tenant_admin.login",
        return_value=login_token,
    ):
        result = th_util._check_admin_exists(
            "https://localhost:8080", "admin@ex.com", "pass"
        )
        assert result == expected


def test_create_tenant_api_call_network_error():
    """Test API call with network error"""
    session = Mock()
    session.post.side_effect = httpx.HTTPError("Connection failed")
    ctx = th_util._AdminContext("https://localhost:8080", session, "admin@ex.com")
    payload = {"email": "admin@ex.com"}
    resp, error = th_util._create_tenant_api_call(ctx, payload)
    assert resp is None
    assert "Network error" in error


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
    # Bad status code
    session.get.side_effect = None
    session.get.return_value = Mock(status_code=404, text="Not found")
    token, error = th_util._get_activation_token(base_url, session, "user123")
    assert token is None
    assert "Failed" in error


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


def test_create_and_activate_admin_scenarios():
    """Test admin creation and activation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    # Full success
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user123", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_user",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.verify_admin_login",
        return_value=(True, ""),
    ):
        success, _ = th_util._create_and_activate_admin(ctx, "tenant")
        assert success is True
    # Create fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=(None, "error"),
    ):
        success, _ = th_util._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Get token fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=(None, "error"),
    ):
        success, _ = th_util._create_and_activate_admin(ctx, "tenant")
        assert success is False
    # Activate fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_user",
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
        "dtaas_services.pkg.services.thingsboard.tenant_admin._check_admin_exists",
        return_value=True,
    ):
        success, _ = th_util._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Create new
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._check_admin_exists",
        return_value=False,
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_and_activate_admin",
        return_value=(True, ""),
    ):
        success, _ = th_util._ensure_tenant_admin(ctx, tenant)
        assert success is True
    # Exception
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._check_admin_exists",
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
        "dtaas_services.pkg.services.thingsboard.tenant_admin.get_or_create_tenant",
        return_value=(tenant, ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._ensure_tenant_admin",
        return_value=(True, ""),
    ):
        ctx = th_util.TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th_util.AdminCredentials("admin@ex.com", "pass")
        success, _ = th_util.create_tenant_and_admin(ctx)
        assert success is True
    # Tenant creation fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.get_or_create_tenant",
        return_value=(None, "error"),
    ):
        ctx = th_util.TenantAdminContext(base_url, session, "test")
        ctx.admin_credentials = th_util.AdminCredentials("admin@ex.com", "pass")
        success, _ = th_util.create_tenant_and_admin(ctx)
        assert success is False


def test_handle_admin_already_exists_scenarios():
    """Test handling when admin already exists"""
    # Admin already exists
    resp = Mock(status_code=400)
    resp.json.return_value = {"message": "User with email already exists"}
    user_id, error = th_util._handle_admin_already_exists(resp)
    assert user_id is None
    assert error == ""
    # Different error message
    resp.json.return_value = {"message": "Invalid request"}
    user_id, error = th_util._handle_admin_already_exists(resp)
    assert user_id is None
    assert error != ""
    # JSON parsing error
    resp.json.side_effect = Exception("JSON error")
    user_id, error = th_util._handle_admin_already_exists(resp)
    assert user_id is None
    assert error != ""


def test_create_tenant_admin_user_status_codes():
    """Test tenant admin user creation with various status codes"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = "password"
    # Status code 202 (unexpected but not 200/201/400)
    session.post.return_value = Mock(status_code=202, text="Created")
    user_id, error = th_util._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert "Failed" in error
    # Status code 400 with unknown error
    session.post.return_value = Mock(status_code=400)
    session.post.return_value.json.side_effect = Exception("JSON error")
    user_id, error = th_util._create_tenant_admin_user(ctx, "tenant")
    assert user_id is None
    assert error != ""


def test_handle_activate_error_scenarios():
    """Test activation error handling"""
    exception = Exception("Test error")
    # SSL error
    success, error = th_util._handle_activate_error("certificate verify failed", exception)
    assert success is False
    assert "SSL" in error
    # Network error
    success, error = th_util._handle_activate_error("connection error", exception)
    assert success is False
    assert "Network error" in error


def test_activate_admin_scenarios():
    """Test admin activation with various scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    # Success path
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_user",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.verify_admin_login",
        return_value=(True, ""),
    ):
        success, error = th_util._activate_admin(ctx, "user123")
        assert success is True
    # Get token fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=(None, "token error"),
    ):
        success, error = th_util._activate_admin(ctx, "user123")
        assert success is False
        assert error == "token error"
    # Activation fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=("token", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_user",
        return_value=(False, "activation error"),
    ):
        success, error = th_util._activate_admin(ctx, "user123")
        assert success is False
        assert error == "activation error"


def test_create_and_activate_admin_with_user_id():
    """Test successful admin creation and activation flow"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    # Full success with activation
    with patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user123", ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_admin",
        return_value=(True, ""),
    ):
        success, error = th_util._create_and_activate_admin(ctx, "tenant123")
        assert success is True


def test_ensure_tenant_admin_invalid_tenant():
    """Test ensuring tenant admin with invalid tenant object"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    # Invalid tenant (missing id)
    invalid_tenant = {"name": "test"}
    success, error = th_util._ensure_tenant_admin(ctx, invalid_tenant)
    assert success is False
    assert "Invalid tenant" in error
    # Empty id
    tenant_no_id = {"id": {}}
    success, error = th_util._ensure_tenant_admin(ctx, tenant_no_id)
    assert success is False
    assert "Invalid tenant" in error
    # None id field
    tenant_none_id = {"id": None}
    success, error = th_util._ensure_tenant_admin(ctx, tenant_none_id)
    assert success is False
    assert "Invalid tenant" in error
