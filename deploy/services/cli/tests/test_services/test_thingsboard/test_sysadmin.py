# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard sysadmin password and authentication operations."""

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
    mock_resp = Mock(status_code=status_code, text="error")
    mock_resp.json.return_value = {"message": "error"}
    mock_session.post.return_value = mock_resp
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(
        "https://localhost:8080", mock_session, pw_config
    )
    success, _ = th_users._change_password_api_call(ctx)
    assert success == expected_success


def test_change_password_api_call_exception():
    """Test password change API call with exception"""
    mock_session = Mock()
    mock_session.post.side_effect = httpx.HTTPError("Error")
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(
        "https://localhost:8080", mock_session, pw_config
    )
    success, _ = th_users._change_password_api_call(ctx)
    assert success is False


def test_perform_password_change_success(mocker):
    """Test successful password change"""
    base_url = "https://localhost:8080"
    session = Mock()
    pw_config = th_users._PasswordConfig(TEST_OLD_PASSWORD, TEST_NEW_PASSWORD)
    ctx = th_users._PasswordChangeContext(base_url, session, pw_config)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._change_password_api_call",
        return_value=(True, ""),
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
        return_value=(False, "error"),
    )
    success, _ = th_users._perform_password_change(ctx)
    assert success is False


def test_change_sysadmin_password_already_changed(mocker, monkeypatch):
    """Test sysadmin password already changed (default login fails, new succeeds)"""
    base_url = "https://localhost:8080"
    session = Mock()
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "sysadmin@thingsboard.org")
    monkeypatch.setenv("TB_SYSADMIN_NEW_PASSWORD", "new")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.get_current_password",
        return_value="",
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login",
        side_effect=["token"],
    )
    mocker.patch("dtaas_services.pkg.services.thingsboard.sysadmin.save_password")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._update_session_token"
    )
    success, _ = th_users.change_sysadmin_password(base_url, session, "new")
    assert success is True


def test_change_sysadmin_password_change_needed(mocker, monkeypatch):
    """Test sysadmin password change when default login succeeds"""
    base_url = "https://localhost:8080"
    session = Mock()
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "sysadmin@thingsboard.org")
    monkeypatch.setenv("TB_SYSADMIN_NEW_PASSWORD", "new")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.get_current_password",
        return_value="",
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login",
        side_effect=[None, "token"],
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._update_session_token"
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin._perform_password_change",
        return_value=(True, "OK"),
    )
    success, _ = th_users.change_sysadmin_password(base_url, session, "new")
    assert success is True


def test_change_sysadmin_password_all_logins_fail(mocker):
    """Test sysadmin password change when all logins fail"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.get_current_password",
        return_value="",
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin.login", return_value=None
    )
    success, _ = th_users.change_sysadmin_password(base_url, session, "new")
    assert success is False


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
