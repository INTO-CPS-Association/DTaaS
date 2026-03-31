# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard tenant management and sysadmin email operations."""

from unittest.mock import Mock
import httpx
import dtaas_services.pkg.services.thingsboard.sysadmin_util as th_util


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
    tenant, error = th_util._check_existing_tenant(params, base_url, session)
    assert tenant is not None
    assert tenant["title"] == "test-tenant"

    # Tenant not found
    session.get.return_value = Mock(status_code=200, json=lambda: {"data": []})
    tenant, error = th_util._check_existing_tenant(params, base_url, session)
    assert tenant is None

    # JSON error
    session.get.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=Exception("JSON decode error")),
    )
    tenant, error = th_util._check_existing_tenant(params, base_url, session)
    assert tenant is None
    assert "json" in error.lower()

    # Request exception
    session.get.side_effect = httpx.HTTPError("Error")
    tenant, error = th_util._check_existing_tenant(params, base_url, session)
    assert tenant is None


def test_create_new_tenant_scenarios():
    """Test tenant creation with multiple scenarios"""
    base_url = "https://localhost:8080"
    session = Mock()

    # Success
    session.post.return_value = Mock(
        status_code=200, json=lambda: {"id": {"id": "123"}, "title": "new"}
    )
    tenant, error = th_util._create_new_tenant(base_url, session, "new")
    assert tenant is not None
    assert error == ""

    # Failure
    session.post.return_value = Mock(status_code=400, text="Error")
    tenant, error = th_util._create_new_tenant(base_url, session, "new")
    assert tenant is None
    assert error != ""

    # JSON error
    session.post.return_value = Mock(
        status_code=200,
        json=Mock(side_effect=Exception("JSON decode error")),
    )
    tenant, error = th_util._create_new_tenant(base_url, session, "new")
    assert tenant is None

    # Request exception
    session.post.side_effect = httpx.HTTPError("Error")
    tenant, error = th_util._create_new_tenant(base_url, session, "new")
    assert tenant is None


def test_get_or_create_tenant_existing(mocker):
    """Test get_or_create_tenant when tenant already exists"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin_util._check_existing_tenant",
        return_value=({"name": "test"}, ""),
    )
    tenant, _ = th_util.get_or_create_tenant(base_url, session, "test")
    assert tenant is not None


def test_get_or_create_tenant_exception(mocker):
    """Test get_or_create_tenant when an exception is raised"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin_util._check_existing_tenant",
        side_effect=Exception("Error"),
    )
    tenant, _ = th_util.get_or_create_tenant(base_url, session, "test")
    assert tenant is None


def test_get_or_create_tenant_check_returns_error(mocker):
    """Test get_or_create_tenant propagates error from _check_existing_tenant"""
    base_url = "https://localhost:8080"
    session = Mock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.sysadmin_util._check_existing_tenant",
        return_value=(None, "Network error checking tenant"),
    )
    tenant, error = th_util.get_or_create_tenant(base_url, session, "test")
    assert tenant is None
    assert "error" in error.lower()


def test_check_existing_tenant_non_200_status():
    """Test _check_existing_tenant returns error on non-200 response"""
    base_url = "https://localhost:8080"
    session = Mock()
    params = {"textSearch": "test-tenant"}
    session.get.return_value = Mock(status_code=403, text="Forbidden")
    tenant, error = th_util._check_existing_tenant(params, base_url, session)
    assert tenant is None
    assert "403" in error


def test_update_sysadmin_email_warns_when_not_set(monkeypatch):
    """Test update_sysadmin_email_in_db warns when TB_SYSADMIN_EMAIL is not set"""
    mock_console = Mock()
    mock_docker = Mock()
    monkeypatch.delenv("TB_SYSADMIN_EMAIL", raising=False)
    th_util.update_sysadmin_email_in_db(mock_console, mock_docker)
    mock_docker.execute.assert_not_called()
    mock_console.print.assert_called_once()
    warning_call = str(mock_console.print.call_args)
    assert "TB_SYSADMIN_EMAIL" in warning_call


def test_update_sysadmin_email_skips_default(monkeypatch):
    """Test update_sysadmin_email_in_db skips when email is the platform default"""
    mock_console = Mock()
    mock_docker = Mock()
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "sysadmin@thingsboard.org")
    th_util.update_sysadmin_email_in_db(mock_console, mock_docker)
    mock_docker.execute.assert_not_called()


def test_update_sysadmin_email_runs_sql(monkeypatch):
    """Test update_sysadmin_email_in_db embeds the email directly in the SQL."""
    mock_console = Mock()
    mock_docker = Mock()
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "admin@example.org")
    th_util.update_sysadmin_email_in_db(mock_console, mock_docker)
    mock_docker.execute.assert_called_once()
    call_args = mock_docker.execute.call_args
    cmd = call_args[0][1]
    assert call_args[0][0] == "postgres"
    assert cmd[0] == "psql"
    # No -v flag; email is embedded directly in the SQL
    assert "-v" not in cmd
    sql_cmd = cmd[cmd.index("-c") + 1]
    assert "admin@example.org" in sql_cmd
    assert "SYS_ADMIN" in sql_cmd


def test_update_sysadmin_email_handles_docker_error(monkeypatch):
    """Test update_sysadmin_email_in_db handles Docker errors gracefully"""
    mock_console = Mock()
    mock_docker = Mock()
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "admin@example.org")
    mock_docker.execute.side_effect = Exception("Container not found")
    th_util.update_sysadmin_email_in_db(mock_console, mock_docker)
    mock_console.print.assert_called()
    warning_call = str(mock_console.print.call_args)
    assert "Warning" in warning_call


def test_update_sysadmin_email_uses_parameterized_sql(monkeypatch):
    """Test that single quotes in email are doubled (SQL-escaped) in the query."""
    mock_console = Mock()
    mock_docker = Mock()
    monkeypatch.setenv("TB_SYSADMIN_EMAIL", "o'brien@test.com")
    th_util.update_sysadmin_email_in_db(mock_console, mock_docker)
    call_args = mock_docker.execute.call_args
    cmd = call_args[0][1]
    sql_cmd = cmd[cmd.index("-c") + 1]
    # Single quote must be doubled for safe SQL embedding
    assert "o''brien@test.com" in sql_cmd
    assert "SYS_ADMIN" in sql_cmd
