"""Tests for ThingsBoard user provisioning and credentials processing."""

from pathlib import Path
from unittest.mock import Mock, mock_open
from dtaas_services.pkg.services.thingsboard import setup as th
# pylint: disable=W0212, W0621

TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"
TEST_INVALID_EMAIL = ""


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


def test_process_credentials_row_success(mocker):
    """Test credentials row processing success scenario"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.create_customer_and_user",
        return_value=(True, ""),
    )
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_EMAIL,
    }
    success, _ = th._process_credentials_row(ctx, cred)
    assert success is True


def test_process_credentials_row_missing_email():
    """Test credentials row processing missing email"""
    base_url = "https://localhost:8080"
    session = Mock()
    ctx = th.CredentialProcessContext(base_url, session)
    cred = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_INVALID_EMAIL,
    }
    success, error = th._process_credentials_row(ctx, cred)
    assert success is False
    assert "Email field is required" in error


def test_process_credentials_file_success(mocker):
    """Test credentials file processing success scenario"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_row",
        return_value=(True, ""),
    )
    success, _ = th._process_credentials_file(
        base_url, session, Path("/test/creds.csv")
    )
    assert success is True


def test_process_credentials_file_row_fails(mocker):
    """Test credentials file processing row fails"""
    base_url = "https://localhost:8080"
    session = Mock()
    csv_data = "username,password,email\nuser1,pass1,user1@ex.com\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._process_credentials_row",
        return_value=(False, "error"),
    )
    success, _ = th._process_credentials_file(
        base_url, session, Path("/test/creds.csv")
    )
    assert success is False


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


def test_process_credentials_file_no_email_column(mocker):
    """Test _process_credentials_file with missing email column"""
    session = Mock()
    csv_data = "username,password\nuser1,pass1\n"
    mocker.patch("pathlib.Path.open", mock_open(read_data=csv_data))
    success, msg = th._process_credentials_file(
        "https://localhost:8080", session, Path("/test/creds.csv")
    )
    assert success is False
    assert "Email column is required" in msg


def test_setup_thingsboard_users_os_error(mocker):
    """Test setup_thingsboard_users handles OSError"""
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup._run_credential_setup",
        side_effect=OSError("disk error"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.build_base_url",
        return_value="https://localhost:8080",
    )
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


def test_authenticate_as_sysadmin_configured_pw(mocker, monkeypatch):
    """Test sysadmin auth succeeds with configured password"""
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "sys@tb.org")
    monkeypatch.setenv("TB_SYSADMIN_NEW_PASSWORD", "newpw")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.login",
        return_value="tok",
    )
    session = Mock()
    session.headers = {}
    ok, _ = th._authenticate_as_sysadmin("url", session)
    assert ok is True


def test_authenticate_as_sysadmin_both_fail(mocker, monkeypatch):
    """Test sysadmin auth fails with both passwords"""
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "sys@tb.org")
    monkeypatch.setenv("TB_SYSADMIN_NEW_PASSWORD", "newpw")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.setup.login",
        return_value=None,
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
