"""Tests for PostgreSQL user management."""

from unittest.mock import Mock, mock_open
from dtaas_services.pkg.services.postgres.user_management import (
    _add_postgres_user,
    _create_database_sql,
    _create_user_sql,
    _get_admin_credentials,
    _handle_psql_result,
    _run_psql,
    setup_postgres_users,
)
from dtaas_services.pkg.utils import create_users_from_credentials

USER_MODULE = "dtaas_services.pkg.services.postgres.user_management"
# pylint: disable=W0621


def test_create_user_sql_basic():
    """SQL contains username and password."""
    sql = _create_user_sql("alice", "secret")
    assert "alice" in sql
    assert "secret" in sql
    assert "CREATE USER" in sql


def test_create_user_sql_escapes_double_quote():
    """Double-quotes in username are escaped with double-double-quotes."""
    sql = _create_user_sql('ad"min', "pass")
    assert 'ad""min' in sql


def test_create_user_sql_escapes_single_quote_in_password():
    """Single-quotes in password are escaped."""
    sql = _create_user_sql("user", "pa'ss")
    assert "pa''ss" in sql


def test_create_database_sql_basic():
    """SQL contains username and OWNER clause."""
    sql = _create_database_sql("alice")
    assert "alice" in sql
    assert "CREATE DATABASE" in sql
    assert "OWNER" in sql


def test_create_database_sql_escapes_double_quote():
    """Double-quotes in username are escaped."""
    sql = _create_database_sql('ad"min')
    assert 'ad""min' in sql


def test_handle_psql_result_success():
    """Success flag returns (True, '')."""
    ok, err = _handle_psql_result(True, "CREATE ROLE", "ignored")
    assert ok is True
    assert err == ""


def test_handle_psql_result_already_exists():
    """'already exists' in output is treated as success."""
    ok, err = _handle_psql_result(False, "ERROR: role already exists", "msg")
    assert ok is True
    assert err == ""


def test_handle_psql_result_failure():
    """Unrecognised failure propagates the error message."""
    ok, err = _handle_psql_result(
        False, "connection refused", "Failed to create user x"
    )
    assert ok is False
    assert "Failed to create user x" in err
    assert "connection refused" in err


def test_get_admin_credentials():
    """Admin credentials are read from Config."""
    user, password = _get_admin_credentials()
    assert user == "dtaas_user"
    assert password == "dtaas_secret"


def test_run_psql_success(mocker):
    """Successful execute_docker_command_with_retry returns (True, output)."""
    mocker.patch(
        f"{USER_MODULE}.execute_docker_command_with_retry",
        return_value=(True, "CREATE ROLE"),
    )

    ok, output = _run_psql("admin", "pass", "CREATE USER test;")
    assert ok is True
    assert "CREATE ROLE" in output


def test_run_psql_docker_exception(mocker):
    """execute_docker_command_with_retry failure makes _run_psql return (False, error)."""
    mocker.patch(
        f"{USER_MODULE}.execute_docker_command_with_retry",
        return_value=(False, "Docker error: error msg"),
    )

    ok, output = _run_psql("admin", "pass", "CREATE USER test;")
    assert ok is False
    assert output != ""


def test_add_postgres_user_success(mocker):
    """Both psql calls succeed — returns (True, '')."""
    mock_run = mocker.patch(f"{USER_MODULE}._run_psql", return_value=(True, ""))
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is True
    assert err == ""
    assert mock_run.call_count == 2


def test_add_postgres_user_create_user_fails(mocker):
    """User creation fails — stops before database creation."""
    mocker.patch(
        f"{USER_MODULE}._run_psql",
        return_value=(False, "connection refused"),
    )
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is False
    assert "Failed to create user alice" in err


def test_add_postgres_user_create_db_fails(mocker):
    """Database creation fails — returns failure."""
    responses = [(True, ""), (False, "disk full")]
    mocker.patch(f"{USER_MODULE}._run_psql", side_effect=responses)
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is False
    assert "Failed to create database alice" in err


def test_add_postgres_user_already_exists(mocker):
    """'already exists' for both calls is treated as success."""
    mocker.patch(
        f"{USER_MODULE}._run_psql",
        return_value=(False, "ERROR: role already exists"),
    )
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is True
    assert err == ""


def test_setup_postgres_users_success(mocker):
    """Credentials processed successfully returns (True, success message)."""
    mocker.patch(
        f"{USER_MODULE}.process_credentials_file",
        return_value=(True, "PostgreSQL users created successfully"),
    )
    ok, msg = setup_postgres_users()
    assert ok is True
    assert "successfully" in msg


def test_setup_postgres_users_failure(mocker):
    """Failure from process_credentials_file is propagated."""
    mocker.patch(
        f"{USER_MODULE}.process_credentials_file",
        return_value=(False, "Credentials file not found"),
    )
    ok, msg = setup_postgres_users()
    assert ok is False
    assert "Credentials file not found" in msg


def test_setup_postgres_users_via_credentials(mocker):
    """Integration: creates users from a CSV credentials file."""
    csv_data = "username,password\nuser1,pass1\nuser2,pass2\n"
    mock_file = mock_open(read_data=csv_data)()
    mock_add = mocker.patch(f"{USER_MODULE}._add_postgres_user")
    mock_add.return_value = (True, "")
    ok, _ = create_users_from_credentials(mock_file, mock_add)
    assert ok is True
    assert mock_add.call_count == 2


def test_setup_postgres_users_via_credentials_failure(mocker):
    """Integration: first user creation failure stops processing."""
    csv_data = "username,password\nuser1,pass1\nuser2,pass2\n"
    mock_file = mock_open(read_data=csv_data)()
    mock_add = mocker.patch(f"{USER_MODULE}._add_postgres_user")
    mock_add.return_value = (False, "error")
    ok, _ = create_users_from_credentials(mock_file, mock_add)
    assert ok is False
    assert mock_add.call_count == 1
