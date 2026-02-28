# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard user operations (low-level)."""

from unittest.mock import Mock
import httpx
import pytest
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
def test_check_admin_exists(mocker, login_token, expected):
    """Test checking if admin exists"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tenant_admin.login",
        return_value=login_token,
    )
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
