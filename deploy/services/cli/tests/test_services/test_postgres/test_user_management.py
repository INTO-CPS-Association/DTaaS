"""Tests for PostgreSQL user management."""

from unittest.mock import MagicMock, patch
from psycopg import errors as pg_errors

from dtaas_services.pkg.services.postgres.user_management import (
    _add_postgres_user,
    _execute_ddl,
    _get_conninfo,
    setup_postgres_users,
)

USER_MODULE = "dtaas_services.pkg.services.postgres.user_management"
# pylint: disable=W0621

TEST_CONNINFO = (
    "host=test.example.com port=5432 user=dtaas_user password=dtaas_secret dbname=postgres" # noqa: S105 # NOSONAR
)


def test_get_conninfo_contains_config_values():
    """Connection info string contains values from config."""
    conninfo = _get_conninfo()
    assert "test.example.com" in conninfo
    assert "5432" in conninfo
    assert "dtaas_user" in conninfo


def test_execute_ddl_success(mocker):
    """Successful DDL execution returns (True, '')."""
    mock_conn = MagicMock()
    mocker.patch(f"{USER_MODULE}.psycopg.connect", return_value=mock_conn.__enter__.return_value)
    with patch(f"{USER_MODULE}.psycopg.connect") as mock_connect:
        mock_connect.return_value.__enter__.return_value = mock_conn
        ok, err = _execute_ddl(TEST_CONNINFO, MagicMock())
    assert ok is True
    assert err == ""
    mock_connect.assert_called_once_with(TEST_CONNINFO, autocommit=True)


def test_execute_ddl_duplicate_role_is_ok(mocker):
    """DuplicateObject (role already exists) is treated as success."""
    with patch(f"{USER_MODULE}.psycopg.connect") as mock_connect:
        mock_conn = MagicMock()
        mock_conn.execute.side_effect = pg_errors.DuplicateObject("exists")
        mock_connect.return_value.__enter__.return_value = mock_conn
        ok, _ = _execute_ddl(TEST_CONNINFO, MagicMock())
    assert ok is True


def test_execute_ddl_duplicate_db_is_ok(mocker):
    """DuplicateDatabase (database already exists) is treated as success."""
    with patch(f"{USER_MODULE}.psycopg.connect") as mock_connect:
        mock_conn = MagicMock()
        mock_conn.execute.side_effect = pg_errors.DuplicateDatabase("exists")
        mock_connect.return_value.__enter__.return_value = mock_conn
        ok, _ = _execute_ddl(TEST_CONNINFO, MagicMock())
    assert ok is True


def test_execute_ddl_connection_error(mocker):
    """Unexpected exception returns (False, message)."""
    with patch(f"{USER_MODULE}.psycopg.connect") as mock_connect:
        mock_connect.side_effect = Exception("connection refused")
        ok, err = _execute_ddl(TEST_CONNINFO, MagicMock())
    assert ok is False
    assert "connection refused" in err


def test_add_postgres_user_success(mocker):
    """Both DDL calls succeed — returns (True, '')."""
    mocker.patch(f"{USER_MODULE}._get_conninfo", return_value=TEST_CONNINFO)
    mocker.patch(f"{USER_MODULE}._execute_ddl", return_value=(True, ""))
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is True
    assert err == ""


def test_add_postgres_user_create_user_fails(mocker):
    """User creation fails — stops before database creation."""
    mocker.patch(f"{USER_MODULE}._get_conninfo", return_value=TEST_CONNINFO)
    mocker.patch(
        f"{USER_MODULE}._execute_ddl",
        return_value=(False, "connection refused"),
    )
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is False
    assert "Failed to create user alice" in err


def test_add_postgres_user_db_creation_fails(mocker):
    """User created but database creation fails."""
    mocker.patch(f"{USER_MODULE}._get_conninfo", return_value=TEST_CONNINFO)
    mocker.patch(
        f"{USER_MODULE}._execute_ddl",
        side_effect=[(True, ""), (False, "permission denied")],
    )
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is False
    assert "Failed to create database alice" in err


def test_setup_postgres_users_success(mocker):
    """Credentials processed successfully returns (True, success message)."""
    mocker.patch(
        f"{USER_MODULE}.process_credentials_file",
        return_value=(True, "PostgreSQL users created successfully"),
    )
    ok, msg = setup_postgres_users()
    assert ok is True
    assert "successfully" in msg
