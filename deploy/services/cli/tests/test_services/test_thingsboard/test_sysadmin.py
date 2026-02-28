# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard users functions."""

from unittest.mock import Mock
import pytest
import httpx
import dtaas_services.pkg.services.thingsboard.sysadmin as th_users

# Test constants (not real credentials, for testing only)
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_OLD_PASSWORD = "old"  # noqa: S105 # NOSONAR
TEST_NEW_PASSWORD = "new"  # noqa: S105 # NOSONAR
TEST_CONFIGURED_PASSWORD = "newpassword"  # noqa: S105 # NOSONAR


@pytest.mark.parametrize(
    "status_code,expected_success",
    [
        (200, True),
        (400, False),
    ],
)
def test_change_password_api_call(status_code, expected_success):
    """Test password change API call with different responses"""
    mock_session = Mock()
    mock_session.post.return_value = Mock(status_code=status_code, text="error")
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(
        "https://localhost:8080", mock_session, pw_config
    )
    result = th_users._change_password_api_call(ctx)
    assert result == expected_success


def test_change_password_api_call_exception():
    """Test password change API call with exception"""
    mock_session = Mock()
    mock_session.post.side_effect = httpx.HTTPError("Error")
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(
        "https://localhost:8080", mock_session, pw_config
    )
    assert th_users._change_password_api_call(ctx) is False


def test_perform_password_change_success(mocker):
    """Test successful password change"""
    base_url = "https://localhost:8080"
    session = Mock()
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(base_url, session, pw_config)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._change_password_api_call",
        return_value=True,
    )
    success, _ = th_users._perform_password_change(ctx)
    assert success is True


def test_perform_password_change_api_fails(mocker):
    """Test password change when API call fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(base_url, session, pw_config)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._change_password_api_call",
        return_value=False,
    )
    success, _ = th_users._perform_password_change(ctx)
    assert success is False


def test_change_sysadmin_password_already_changed(mocker):
    """Test sysadmin password already changed (default login fails, new succeeds)"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login",
        side_effect=[None, "token"],
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._update_session_token"
    )
    success, _ = th_users.change_sysadmin_password_if_needed(base_url, session, "new")
    assert success is True


def test_change_sysadmin_password_change_needed(mocker):
    """Test sysadmin password change when default login succeeds"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login", return_value="token"
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._update_session_token"
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._perform_password_change",
        return_value=(True, "OK"),
    )
    success, _ = th_users.change_sysadmin_password_if_needed(base_url, session, "new")
    assert success is True


def test_change_sysadmin_password_all_logins_fail(mocker):
    """Test sysadmin password change when both logins fail"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login", return_value=None
    )
    success, _ = th_users.change_sysadmin_password_if_needed(base_url, session, "new")
    assert success is False


def test_check_existing_tenant_scenarios():
    """Test checking for existing tenant with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    params = {"textSearch": "test-tenant"}

    # Tenant found
    session.get.return_value = Mock(
        status_code=200,
        json=lambda: {"data": [{"title": "test-tenant", "id": {"id": "123"}}]},
    )
    tenant, error = th_users._check_existing_tenant(params, base_url, session)
    assert tenant is not None
    assert tenant["title"] == "test-tenant"

    # Tenant not found
    session.get.return_value = Mock(status_code=200, json=lambda: {"data": []})
    tenant, error = th_users._check_existing_tenant(params, base_url, session)
    assert tenant is None

    # JSON error
    session.get.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=Exception("JSON decode error")),
    )
    tenant, error = th_users._check_existing_tenant(params, base_url, session)
    assert tenant is None
    assert "json" in error.lower()

    # Request exception
    session.get.side_effect = httpx.HTTPError("Error")
    tenant, error = th_users._check_existing_tenant(params, base_url, session)
    assert tenant is None


def test_create_new_tenant_scenarios():
    """Test tenant creation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()

    # Success
    session.post.return_value = Mock(
        status_code=200, json=lambda: {"id": {"id": "123"}, "title": "new"}
    )
    tenant, error = th_users._create_new_tenant(base_url, session, "new")
    assert tenant is not None
    assert error == ""

    # Failure
    session.post.return_value = Mock(status_code=400, text="Error")
    tenant, error = th_users._create_new_tenant(base_url, session, "new")
    assert tenant is None
    assert error != ""

    # JSON error
    session.post.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=Exception("JSON decode error")),
    )
    tenant, error = th_users._create_new_tenant(base_url, session, "new")
    assert tenant is None

    # Request exception
    session.post.side_effect = httpx.HTTPError("Error")
    tenant, error = th_users._create_new_tenant(base_url, session, "new")
    assert tenant is None


def test_get_or_create_tenant_existing(mocker):
    """Test get_or_create_tenant when tenant already exists"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._check_existing_tenant",
        return_value=({"name": "test"}, ""),
    )
    tenant, _ = th_users.get_or_create_tenant(base_url, session, "test")
    assert tenant is not None


def test_get_or_create_tenant_exception(mocker):
    """Test get_or_create_tenant when an exception is raised"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._check_existing_tenant",
        side_effect=Exception("Error"),
    )
    tenant, _ = th_users.get_or_create_tenant(base_url, session, "test")
    assert tenant is None


def test_get_or_create_tenant_check_returns_error(mocker):
    """Test get_or_create_tenant propagates error from _check_existing_tenant"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._check_existing_tenant",
        return_value=(None, "Network error checking tenant"),
    )
    tenant, error = th_users.get_or_create_tenant(base_url, session, "test")
    assert tenant is None
    assert "error" in error.lower()


def test_authenticate_session_default_pw_succeeds(mocker, monkeypatch):
    """Test authenticate_session succeeds with the default sysadmin password"""
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "sysadmin@thingsboard.org")
    monkeypatch.delenv("TB_SYSADMIN_NEW_PASSWORD", raising=False)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login",
        return_value="token",
    )
    session = Mock()
    session.headers = {}
    ok, msg = th_users.authenticate_session("https://localhost:8080", session)
    assert ok is True
    assert msg == ""
    assert session.headers["X-Authorization"] == "Bearer token"


def test_authenticate_session_fallback_pw_succeeds(mocker, monkeypatch):
    """Test authenticate_session falls back to TB_SYSADMIN_NEW_PASSWORD"""
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "sysadmin@thingsboard.org")
    monkeypatch.setenv("TB_SYSADMIN_NEW_PASSWORD", "newpass")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login",
        side_effect=[None, "token"],
    )
    session = Mock()
    session.headers = {}
    ok, _ = th_users.authenticate_session("https://localhost:8080", session)
    assert ok is True
    assert session.headers["X-Authorization"] == "Bearer token"


def test_check_existing_tenant_non_200_status():
    """Test _check_existing_tenant returns error on non-200 response"""
    base_url = "https://localhost:8080"
    session = Mock()
    params = {"textSearch": "test-tenant"}
    session.get.return_value = Mock(status_code=403, text="Forbidden")
    tenant, error = th_users._check_existing_tenant(params, base_url, session)
    assert tenant is None
    assert "403" in error
