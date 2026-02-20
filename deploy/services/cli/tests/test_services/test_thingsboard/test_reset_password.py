"""Tests for ThingsBoard password helpers and sysadmin password reset."""

import httpx
from pathlib import Path
from unittest.mock import Mock
import dtaas_services.pkg.services.thingsboard.setup as th
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
        "dtaas_services.pkg.services.thingsboard.setup.change_sysadmin_password_if_needed",
        return_value=(True, "Password changed"),
    )
    success, _ = th._change_password_with_logging(
        "https://localhost:8080", session, "newpass"
    )
    assert success is True


def test_handle_password_change_result_recoverable_error():
    """Test _handle_password_change_result with recoverable error"""
    should_continue, error = th._handle_password_change_result(
        False, "Server not reachable"
    )
    assert should_continue is True
    assert error is None


def test_handle_password_change_result_fatal_error():
    """Test _handle_password_change_result with fatal error"""
    should_continue, error = th._handle_password_change_result(
        False, "Invalid credentials format"
    )
    assert should_continue is False
    assert error is not None


def test_handle_password_change_result_success():
    """Test _handle_password_change_result on success (success=True)"""
    should_continue, error = th._handle_password_change_result(True, "")
    assert should_continue is True
    assert error is None


def test_handle_password_setup_with_password(mocker):
    """Test _handle_password_setup with password"""
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._change_password_with_logging",
        return_value=(True, "Changed"),
    )
    should_continue, _ = th._handle_password_setup(
        "https://localhost:8080", session, "newpass"
    )
    assert should_continue is True


def test_handle_password_setup_no_password():
    """Test _handle_password_setup with new_pw=None skips change and continues"""
    session = Mock()
    should_continue, error = th._handle_password_setup(
        "https://localhost:8080", session, None
    )
    assert should_continue is True
    assert error is None


def test_setup_helper_certs_value_error(mocker):
    """Test _setup_helper_certs handles ValueError"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._create_session",
        side_effect=ValueError("Bad config"),
    )
    success, msg = th._setup_helper_certs(Path("/test/creds.csv"))
    assert success is False
    assert "Error" in msg


def test_setup_helper_certs_key_error(mocker):
    """Test _setup_helper_certs handles KeyError"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.Config",
        side_effect=KeyError("missing key"),
    )
    success, msg = th._setup_helper_certs(Path("/test/creds.csv"))
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
        "dtaas_services.pkg.services.thingsboard.setup._change_password_with_logging",
        return_value=(True, ""),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is True
    assert "updated successfully" in msg


def test_reset_thingsboard_password_change_fails(mocker):
    """Test reset_thingsboard_password when password change fails"""
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
        "dtaas_services.pkg.services.thingsboard.setup._change_password_with_logging",
        return_value=(False, "Auth failed"),
    )
    success, msg = th.reset_thingsboard_password()
    assert success is False
    assert "Auth failed" in msg


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
