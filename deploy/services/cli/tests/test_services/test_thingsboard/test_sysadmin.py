# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard users functions."""

from unittest.mock import patch, Mock
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


def test_perform_password_change_scenarios():
    """Test password change with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(base_url, session, pw_config)

    # Success case
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._change_password_api_call",
        return_value=True,
    ), patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login", return_value="token"
    ), patch("dtaas_services.pkg.services.thingsboard.sysadmin._update_session_token"):
        success, _ = th_users._perform_password_change(ctx)
        assert success is True

    # API call fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._change_password_api_call",
        return_value=False,
    ):
        success, _ = th_users._perform_password_change(ctx)
        assert success is False

    # Re-login fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._change_password_api_call",
        return_value=True,
    ), patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login", return_value=None
    ):
        success, _ = th_users._perform_password_change(ctx)
        assert success is False


def test_change_sysadmin_password_scenarios():
    """Test sysadmin password change with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()

    # Password already changed
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._try_login_with_new_password",
        return_value="token",
    ), patch("dtaas_services.pkg.services.thingsboard.sysadmin._update_session_token"):
        success, _ = th_users.change_sysadmin_password_if_needed(
            base_url, session, "new"
        )
        assert success is True

    # Change needed
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._try_login_with_new_password",
        return_value=None,
    ), patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login", return_value="token"
    ), patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._update_session_token"
    ), patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._perform_password_change",
        return_value=(True, "OK"),
    ):
        success, _ = th_users.change_sysadmin_password_if_needed(
            base_url, session, "new"
        )
        assert success is True

    # Default login fails
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._try_login_with_new_password",
        return_value=None,
    ), patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login", return_value=None
    ):
        success, _ = th_users.change_sysadmin_password_if_needed(
            base_url, session, "new"
        )
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


def test_get_or_create_tenant_scenarios():
    """Test get or create tenant with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()

    # Existing tenant
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._check_existing_tenant",
        return_value=({"name": "test"}, ""),
    ):
        tenant, _ = th_users.get_or_create_tenant(base_url, session, "test")
        assert tenant is not None

    # Create new
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._check_existing_tenant",
        return_value=(None, ""),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._create_new_tenant",
        return_value=({"title": "new"}, ""),
    ):
        tenant, _ = th_users.get_or_create_tenant(base_url, session, "new")
        assert tenant is not None

    # Exception
    with patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._check_existing_tenant",
        side_effect=Exception("Error"),
    ):
        tenant, _ = th_users.get_or_create_tenant(base_url, session, "test")
        assert tenant is None
