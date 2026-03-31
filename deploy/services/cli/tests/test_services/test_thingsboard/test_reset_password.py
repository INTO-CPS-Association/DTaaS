"""Tests for ThingsBoard password helpers and sysadmin password reset."""

from unittest.mock import Mock
import httpx
from dtaas_services.pkg.services.thingsboard import setup as th
from .conftest import _setup_thingsboard_error_test
# pylint: disable=W0212, W0621


def test_check_password_configured_when_set(monkeypatch):
    """Test check_password_configured returns password when env var is set"""
    monkeypatch.setenv("TB_SYSADMIN_NEW_PASSWORD", "mysecret")  # noqa: S105 # NOSONAR
    result = th.check_password_configured()
    assert result == "mysecret"


def test_change_password_with_logging_success(mocker):
    """Test _change_password_with_logging suppresses logging"""
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_sysadmin_password",
        return_value=(True, "Password changed"),
    )
    success, _ = th._change_password_with_logging(
        "https://localhost:8080", session, "newpass"
    )
    assert success is True


def test_setup_thingsboard_users_value_error(mocker):
    """Test setup_thingsboard_users handles ValueError"""
    _setup_thingsboard_error_test(mocker, ValueError, "Bad config")
    success, msg = th.setup_thingsboard_users()
    assert success is False
    assert "Error" in msg


def test_setup_thingsboard_users_key_error(mocker):
    """Test setup_thingsboard_users handles KeyError"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._run_credential_setup",
        side_effect=KeyError("missing key"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    success, msg = th.setup_thingsboard_users()
    assert success is False
    assert "Error" in msg


def test_reset_thingsboard_password_no_env(mocker):
    """Test reset_thingsboard_password when TB_SYSADMIN_NEW_PASSWORD is not set"""
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup.Config")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup._create_session")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.check_password_configured",
        return_value=None,
    )
    success, msg = th.reset_thingsboard_password()
    assert success is False
    assert "TB_SYSADMIN_NEW_PASSWORD" in msg


def test_reset_thingsboard_password_success(mocker):
    """Test reset_thingsboard_password on success"""
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup.Config")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup._create_session")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.check_password_configured",
        return_value="newpass",  # noqa: S105 # NOSONAR
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._reset_sysadmin_credentials",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_tenant_admin_password",
        return_value=(True, ""),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is True
    assert "updated successfully" in msg


def test_reset_thingsboard_password_change_fails(mocker):
    """Test reset_thingsboard_password when sysadmin credentials reset fails"""
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup.Config")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup._create_session")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.check_password_configured",
        return_value="newpass",  # noqa: S105 # NOSONAR
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._reset_sysadmin_credentials",
        return_value=(False, "Auth failed"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_tenant_admin_password",
        return_value=(True, ""),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is False
    assert "Auth failed" in msg


def test_reset_thingsboard_password_tenant_admin_fails(mocker):
    """Test that sysadmin success + tenant admin failure returns True with a warning."""
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup.Config")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup._create_session")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.check_password_configured",
        return_value="newpass",  # noqa: S105 # NOSONAR
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._reset_sysadmin_credentials",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.change_tenant_admin_password",
        return_value=(False, "tenant admin error"),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is True
    assert "Sysadmin password reset successfully" in msg
    assert "tenant admin error" in msg
    assert "Re-run" in msg


def test_reset_thingsboard_password_both_fail(mocker):
    """Test that sysadmin failure is always a hard error regardless of tenant admin."""
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup.Config")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup._create_session")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.check_password_configured",
        return_value="newpass",  # noqa: S105 # NOSONAR
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._reset_sysadmin_credentials",
        return_value=(False, "sysadmin auth failed"),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is False
    assert "sysadmin auth failed" in msg


def test_reset_thingsboard_password_http_error(mocker):
    """Test reset_thingsboard_password handles network errors"""
    mocker.patch("dtaas_services.pkg.services.thingsboard.setup.Config")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._create_session",
        side_effect=httpx.NetworkError("connection refused"),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is False
    assert "Cannot connect" in msg


def test_reset_thingsboard_password_value_error(mocker):
    """Test reset_thingsboard_password handles ValueError (e.g. bad config)"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.Config",
        side_effect=ValueError("bad config"),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is False
    assert "Error" in msg


def test_reset_sysadmin_credentials_success(mocker):
    """Test _reset_sysadmin_credentials returns True when both email and password succeed"""
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_sysadmin_email_if_needed",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_password_with_logging",
        return_value=(True, ""),
    )
    ok, msg = th._reset_sysadmin_credentials(
        "https://localhost:8080", session, "newpass"
    )
    assert ok is True
    assert msg == ""


def test_reset_sysadmin_credentials_email_fails(mocker):
    """Test _reset_sysadmin_credentials returns False when email change fails"""
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_sysadmin_email_if_needed",
        return_value=(False, "email error"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_password_with_logging",
        return_value=(True, ""),
    )
    ok, msg = th._reset_sysadmin_credentials(
        "https://localhost:8080", session, "newpass"
    )
    assert ok is False
    assert "email error" in msg


def test_reset_sysadmin_credentials_password_fails(mocker):
    """Test _reset_sysadmin_credentials returns False when password change fails"""
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_sysadmin_email_if_needed",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_password_with_logging",
        return_value=(False, "pw error"),
    )
    ok, msg = th._reset_sysadmin_credentials(
        "https://localhost:8080", session, "newpass"
    )
    assert ok is False
    assert "pw error" in msg
