# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard users functions."""

import os
from unittest.mock import patch, Mock
import pytest
import httpx
import dtaas_services.pkg.thingsboard_users as th_users

# Test constants (not real credentials, for testing only)
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_OLD_PASSWORD = "old"  # noqa: S105 # NOSONAR
TEST_NEW_PASSWORD = "new"  # noqa: S105 # NOSONAR
TEST_CONFIGURED_PASSWORD = "newpassword"  # noqa: S105 # NOSONAR


# Base URL and Login Tests
@pytest.mark.parametrize(
    "env_vars,expected_url",
    [
        (
            {
                "HOSTNAME": "localhost",
                "THINGSBOARD_PORT": "8080",
                "THINGSBOARD_SCHEME": "https",
            },
            "https://localhost:8080",
        ),
        (
            {
                "HOSTNAME": "custom.example.com",
                "THINGSBOARD_PORT": "9090",
                "THINGSBOARD_SCHEME": "https",
            },
            "https://custom.example.com:9090",
        ),
    ],
)
def test_build_base_url(env_vars, expected_url):
    """Test building base URL with different configurations"""
    with patch.dict(os.environ, env_vars, clear=False):
        assert th_users.build_base_url() == expected_url


@pytest.mark.parametrize(
    "status_code,json_data,expected_token",
    [
        (200, {"token": "test_token"}, "test_token"),
        (401, None, None),
        (500, None, None),
    ],
)
def test_handle_login_response(status_code, json_data, expected_token):
    """Test handling different login response scenarios"""
    mock_response = Mock()
    mock_response.status_code = status_code
    if json_data:
        mock_response.json.return_value = json_data
    mock_response.text = "error"
    assert th_users._handle_login_response(mock_response) == expected_token


def test_login_scenarios():
    """Test login with success, failure, and exception"""
    base_url = "https://localhost:8080"
    email = TEST_EMAIL
    password = TEST_PASSWORD

    # Success case
    with patch("httpx.post") as mock_post:
        mock_post.return_value = Mock(
            status_code=200, json=lambda: {"token": "token123"}
        )
        assert th_users.login(base_url, email, password) == "token123"

    # Failure case
    with patch("httpx.post") as mock_post:
        mock_post.return_value = Mock(status_code=401)
        assert th_users.login(base_url, email, password) is None

    # Exception case
    with patch("httpx.post", side_effect=httpx.HTTPError("Error")):
        assert th_users.login(base_url, email, password) is None


# Password Configuration Tests
@pytest.mark.parametrize(
    "env_password,expected",
    [
        (TEST_CONFIGURED_PASSWORD, TEST_CONFIGURED_PASSWORD),
        (None, None),
    ],
)
def test_check_password_configured(env_password, expected):
    """Test password configuration checking"""
    env_dict = {"TB_SYSADMIN_NEW_PASSWORD": env_password} if env_password else {}
    with patch.dict(os.environ, env_dict, clear=True):
        assert th_users.check_password_configured() == expected


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
        "dtaas_services.pkg.thingsboard_users._change_password_api_call",
        return_value=True,
    ), patch("dtaas_services.pkg.thingsboard_users.login", return_value="token"), patch(
        "dtaas_services.pkg.thingsboard_users._update_session_token"
    ):
        success, _ = th_users._perform_password_change(ctx)
        assert success is True

    # API call fails
    with patch(
        "dtaas_services.pkg.thingsboard_users._change_password_api_call",
        return_value=False,
    ):
        success, _ = th_users._perform_password_change(ctx)
        assert success is False

    # Re-login fails
    with patch(
        "dtaas_services.pkg.thingsboard_users._change_password_api_call",
        return_value=True,
    ), patch("dtaas_services.pkg.thingsboard_users.login", return_value=None):
        success, _ = th_users._perform_password_change(ctx)
        assert success is False


def test_change_sysadmin_password_scenarios():
    """Test sysadmin password change with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()

    # Password already changed
    with patch(
        "dtaas_services.pkg.thingsboard_users._try_login_with_new_password",
        return_value="token",
    ), patch("dtaas_services.pkg.thingsboard_users._update_session_token"):
        success, _ = th_users.change_sysadmin_password_if_needed(
            base_url, session, "new"
        )
        assert success is True

    # Change needed
    with patch(
        "dtaas_services.pkg.thingsboard_users._try_login_with_new_password",
        return_value=None,
    ), patch("dtaas_services.pkg.thingsboard_users.login", return_value="token"), patch(
        "dtaas_services.pkg.thingsboard_users._update_session_token"
    ), patch(
        "dtaas_services.pkg.thingsboard_users._perform_password_change",
        return_value=(True, "OK"),
    ):
        success, _ = th_users.change_sysadmin_password_if_needed(
            base_url, session, "new"
        )
        assert success is True

    # Default login fails
    with patch(
        "dtaas_services.pkg.thingsboard_users._try_login_with_new_password",
        return_value=None,
    ), patch("dtaas_services.pkg.thingsboard_users.login", return_value=None):
        success, _ = th_users.change_sysadmin_password_if_needed(
            base_url, session, "new"
        )
        assert success is False


# Tenant Management Tests
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
        "dtaas_services.pkg.thingsboard_users._check_existing_tenant",
        return_value=({"name": "test"}, ""),
    ):
        tenant, _ = th_users.get_or_create_tenant(base_url, session, "test")
        assert tenant is not None

    # Create new
    with patch(
        "dtaas_services.pkg.thingsboard_users._check_existing_tenant",
        return_value=(None, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_users._create_new_tenant",
        return_value=({"title": "new"}, ""),
    ):
        tenant, _ = th_users.get_or_create_tenant(base_url, session, "new")
        assert tenant is not None

    # Exception
    with patch(
        "dtaas_services.pkg.thingsboard_users._check_existing_tenant",
        side_effect=Exception("Error"),
    ):
        tenant, _ = th_users.get_or_create_tenant(base_url, session, "test")
        assert tenant is None
