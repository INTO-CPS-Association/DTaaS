"""Tests for ThingsBoard tenant and admin composition functions."""

from unittest.mock import Mock
import httpx
from dtaas_services.pkg.services.thingsboard import tenant_admin as th_util
# pylint: disable=W0212

TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR


def test_create_and_activate_admin_success(mocker):
    """Test admin creation and activation - full success"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user123", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.get_activation_token",
        return_value=("token", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.activate_user",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.verify_admin_login",
        return_value=(True, ""),
    )
    success, _ = th_util._create_and_activate_admin(ctx, "tenant")
    assert success is True


def test_create_and_activate_admin_create_fails(mocker):
    """Test admin creation and activation - create fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=(None, "error"),
    )
    success, _ = th_util._create_and_activate_admin(ctx, "tenant")
    assert success is False


def test_create_and_activate_admin_token_fails(mocker):
    """Test admin creation and activation - get token fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.get_activation_token",
        return_value=(None, "error"),
    )
    success, _ = th_util._create_and_activate_admin(ctx, "tenant")
    assert success is False


def test_ensure_tenant_admin_exception(mocker):
    """Test ensuring tenant admin - exception raised"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    tenant = {"id": {"id": "tenant123"}}
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._check_admin_exists",
        side_effect=Exception("Error"),
    )
    success, _ = th_util._ensure_tenant_admin(ctx, tenant)
    assert success is False


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


def test_create_tenant_and_admin_success(mocker):
    """Test tenant and admin creation - success"""
    base_url = "https://localhost:8080"
    session = Mock()
    tenant = {"id": {"id": "123"}}
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.get_or_create_tenant",
        return_value=(tenant, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._ensure_tenant_admin",
        return_value=(True, ""),
    )
    ctx = th_util.TenantAdminContext(base_url, session, "test")
    ctx.admin_credentials = th_util.AdminCredentials("admin@ex.com", "pass")
    success, _ = th_util.create_tenant_and_admin(ctx)
    assert success is True


def test_create_tenant_and_admin_tenant_fails(mocker):
    """Test tenant and admin creation - tenant creation fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.get_or_create_tenant",
        return_value=(None, "error"),
    )
    ctx = th_util.TenantAdminContext(base_url, session, "test")
    ctx.admin_credentials = th_util.AdminCredentials("admin@ex.com", "pass")
    success, _ = th_util.create_tenant_and_admin(ctx)
    assert success is False


def test_login_as_tenant_admin_default_pw(mocker):
    """Test login succeeds with default password"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.login",
        return_value="token123",
    )
    token, msg = th_util._login_as_tenant_admin("url", "a@b.com", "newpw")
    assert token == "token123"
    assert msg == ""


def test_login_as_tenant_admin_already_changed(mocker):
    """Test tenant admin already uses configured password"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.login",
        side_effect=[None, "token456"],
    )
    token, msg = th_util._login_as_tenant_admin("url", "a@b.com", "newpw")
    assert token is None
    assert msg == ""


def test_login_as_tenant_admin_both_fail(mocker):
    """Test both default and configured password fail"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.login",
        return_value=None,
    )
    token, msg = th_util._login_as_tenant_admin("url", "a@b.com", "newpw")
    assert token is None
    assert "Failed to authenticate" in msg


def test_call_change_password_api_success():
    """Test successful API call to change password"""
    session = Mock()
    session.post.return_value = Mock(status_code=200)
    success, _ = th_util._call_change_password_api("url", session, "newpw")
    assert success is True


def test_call_change_password_api_failure():
    """Test API call returns non-200"""
    session = Mock()
    session.post.return_value = Mock(status_code=400)
    success, msg = th_util._call_change_password_api("url", session, "newpw")
    assert success is False
    assert "Failed to change" in msg


def test_call_change_password_api_network_error():
    """Test API call raises network error"""
    session = Mock()
    session.post.side_effect = httpx.NetworkError("timeout")
    success, msg = th_util._call_change_password_api("url", session, "newpw")
    assert success is False
    assert "Network error" in msg


def test_change_tenant_admin_password_not_set(monkeypatch):
    """Test skips when TB_TENANT_ADMIN_PASSWORD is not set"""
    monkeypatch.setenv("TB_TENANT_ADMIN_EMAIL", "admin@test.org")
    monkeypatch.delenv("TB_TENANT_ADMIN_PASSWORD", raising=False)
    session = Mock()
    success, msg = th_util.change_tenant_admin_password("url", session)
    assert success is True
    assert "Skipped" in msg


def test_change_tenant_admin_password_success(mocker, monkeypatch):
    """Test successful tenant admin password change"""
    monkeypatch.setenv("TB_TENANT_ADMIN_EMAIL", "admin@test.org")
    monkeypatch.setenv("TB_TENANT_ADMIN_PASSWORD", "newpw")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._login_as_tenant_admin",
        return_value=("token123", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._call_change_password_api",
        return_value=(True, ""),
    )
    session = Mock()
    session.headers = {}
    success, _ = th_util.change_tenant_admin_password("url", session)
    assert success is True


def test_change_tenant_admin_password_already_updated(mocker, monkeypatch):
    """Test when tenant admin already uses configured password"""
    monkeypatch.setenv("TB_TENANT_ADMIN_EMAIL", "admin@test.org")
    monkeypatch.setenv("TB_TENANT_ADMIN_PASSWORD", "newpw")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._login_as_tenant_admin",
        return_value=(None, ""),
    )
    session = Mock()
    success, msg = th_util.change_tenant_admin_password("url", session)
    assert success is True
    assert "already updated" in msg


def test_change_tenant_admin_password_auth_fails(mocker, monkeypatch):
    """Test when login fails for tenant admin"""
    monkeypatch.setenv("TB_TENANT_ADMIN_EMAIL", "admin@test.org")
    monkeypatch.setenv("TB_TENANT_ADMIN_PASSWORD", "newpw")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._login_as_tenant_admin",
        return_value=(None, "Failed to authenticate"),
    )
    session = Mock()
    success, msg = th_util.change_tenant_admin_password("url", session)
    assert success is False
    assert "Failed to authenticate" in msg
