"""Tests for ThingsBoard tenant and admin composition functions."""

from unittest.mock import Mock
import dtaas_services.pkg.services.thingsboard.tenant_admin as th_util
# pylint: disable=W0212, W0621


# Test constants (not real credentials, for testing only)
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
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=("token", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_user",
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
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=(None, "error"),
    )
    success, _ = th_util._create_and_activate_admin(ctx, "tenant")
    assert success is False


def test_create_and_activate_admin_activate_fails(mocker):
    """Test admin creation and activation - activate fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._get_activation_token",
        return_value=("token", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_user",
        return_value=(False, "error"),
    )
    success, _ = th_util._create_and_activate_admin(ctx, "tenant")
    assert success is False


def test_create_and_activate_admin_with_user_id(mocker):
    """Test successful admin creation and activation flow"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_tenant_admin_user",
        return_value=("user123", ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._activate_admin",
        return_value=(True, ""),
    )
    success, _ = th_util._create_and_activate_admin(ctx, "tenant123")
    assert success is True


def test_ensure_tenant_admin_already_exists(mocker):
    """Test ensuring tenant admin - admin already exists"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    tenant = {"id": {"id": "tenant123"}}
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._check_admin_exists",
        return_value=True,
    )
    success, _ = th_util._ensure_tenant_admin(ctx, tenant)
    assert success is True


def test_ensure_tenant_admin_create_new(mocker):
    """Test ensuring tenant admin - create new admin"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th_util._AdminContext(base_url, session, "admin@ex.com")
    ctx.admin_password = TEST_PASSWORD
    tenant = {"id": {"id": "tenant123"}}
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._check_admin_exists",
        return_value=False,
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin._create_and_activate_admin",
        return_value=(True, ""),
    )
    success, _ = th_util._ensure_tenant_admin(ctx, tenant)
    assert success is True


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
