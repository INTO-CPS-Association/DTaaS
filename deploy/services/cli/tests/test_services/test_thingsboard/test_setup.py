"""Tests for ThingsBoard setup orchestration and authentication."""

from unittest.mock import Mock
from dtaas_services.pkg.services.thingsboard import setup as th
from .conftest import _setup_thingsboard_error_test
# pylint: disable=W0212, W0621


def test_authenticate_as_tenant_admin_default_pw(mocker, monkeypatch):
    """Test auth with default password succeeds."""
    monkeypatch.setenv("TB_TENANT_ADMIN_EMAIL", "admin@test.org")
    monkeypatch.delenv("TB_TENANT_ADMIN_PASSWORD", raising=False)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.login",
        return_value="tok",
    )
    session = Mock()
    session.headers = {}
    ok, _ = th._authenticate_as_tenant_admin("url", session)
    assert ok is True


def test_authenticate_as_tenant_admin_both_fail(mocker, monkeypatch):
    """Test auth fails with both passwords."""
    monkeypatch.setenv("TB_TENANT_ADMIN_EMAIL", "admin@test.org")
    monkeypatch.setenv("TB_TENANT_ADMIN_PASSWORD", "configured")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.login",
        return_value=None,
    )
    session = Mock()
    ok, err = th._authenticate_as_tenant_admin("url", session)
    assert ok is False
    assert "Failed" in err


def test_setup_thingsboard_users_file_not_found(mocker):
    """Test ThingsBoard users setup file not found"""
    mocker.patch("pathlib.Path.exists", return_value=False)
    success, msg = th.setup_thingsboard_users()
    assert success is False
    assert "not found" in msg


def test_setup_thingsboard_users_password_fails(mocker):
    """Test ThingsBoard users setup authentication fails"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("httpx.Client")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._create_tenant_setup",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._authenticate_as_tenant_admin",
        return_value=(False, "auth error"),
    )
    success, _ = th.setup_thingsboard_users()
    assert success is False


def test_setup_thingsboard_users_os_error(mocker):
    """Test setup_thingsboard_users handles OSError"""
    _setup_thingsboard_error_test(mocker, OSError, "disk error")
    success, msg = th.setup_thingsboard_users()
    assert success is False
    assert "Cannot connect" in msg


def test_setup_thingsboard_users_tenant_setup_fails(mocker):
    """Test setup_thingsboard_users when tenant creation fails"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
    mocker.patch("httpx.Client")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._create_tenant_setup",
        return_value=(False, "sysadmin auth failed"),
    )
    success, _ = th.setup_thingsboard_users()
    assert success is False


def test_authenticate_as_sysadmin_configured_pw(mocker):
    """Test sysadmin auth succeeds with configured password"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.authenticate_session",
        return_value=(True, ""),
    )
    session = Mock()
    session.headers = {}
    ok, _ = th._authenticate_as_sysadmin("url", session)
    assert ok is True


def test_authenticate_as_sysadmin_both_fail(mocker):
    """Test sysadmin auth fails when authenticate_session fails"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.authenticate_session",
        return_value=(False, "Failed to authenticate"),
    )
    session = Mock()
    ok, err = th._authenticate_as_sysadmin("url", session)
    assert ok is False
    assert "Failed" in err


def test_create_tenant_setup_success(mocker, monkeypatch):
    """Test tenant setup success"""
    monkeypatch.setenv("TB_TENANT_TITLE", "TestTenant")
    monkeypatch.setenv("TB_TENANT_ADMIN_EMAIL", "admin@test.org")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._authenticate_as_sysadmin",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.create_tenant_and_admin",
        return_value=(True, ""),
    )
    session = Mock()
    ok, _ = th._create_tenant_setup("url", session)
    assert ok is True


def test_create_tenant_setup_sysadmin_fails(mocker):
    """Test tenant setup fails when sysadmin auth fails"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._authenticate_as_sysadmin",
        return_value=(False, "auth error"),
    )
    session = Mock()
    ok, err = th._create_tenant_setup("url", session)
    assert ok is False
    assert "auth error" in err


def test_check_password_configured_not_set(monkeypatch):
    """Test check_password_configured when env var is not set."""
    monkeypatch.delenv("TB_SYSADMIN_NEW_PASSWORD", raising=False)
    result = th.check_password_configured()
    assert result is None
