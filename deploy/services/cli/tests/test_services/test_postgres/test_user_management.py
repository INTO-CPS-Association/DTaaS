"""Tests for PostgreSQL user management."""

from unittest.mock import MagicMock
from psycopg import errors as pg_errors

from dtaas_services.pkg.services.postgres.user_management import (
    _add_postgres_user,
    _execute_ddl,
    _get_engine,
    setup_postgres_users,
)

USER_MODULE = "dtaas_services.pkg.services.postgres.user_management"
# pylint: disable=W0621


def _make_engine(side_effect=None):
    """Build a mock SQLAlchemy engine with optional cursor.execute side effect."""
    cur = MagicMock()
    if side_effect is not None:
        cur.execute.side_effect = side_effect
    raw = MagicMock()
    raw.cursor.return_value = cur
    engine = MagicMock()
    engine.raw_connection.return_value = raw
    return engine, raw, cur


def test_get_engine_builds_url(mocker):
    """Engine URL contains the psycopg3 scheme and config values."""
    mock_create = mocker.patch(f"{USER_MODULE}.create_engine")
    _get_engine()
    url = mock_create.call_args[0][0]
    assert "postgresql+psycopg://" in url
    assert "dtaas_user" in url
    assert "test.example.com" in url
    assert "5432" in url


def test_execute_ddl_success():
    """Successful DDL execution sets autocommit and returns (True, '')."""
    engine, raw, _ = _make_engine()
    ok, err = _execute_ddl(engine, MagicMock())
    assert ok is True
    assert err == ""
    assert raw.autocommit is True
    raw.commit.assert_not_called()


def test_execute_ddl_duplicate_role_is_ok():
    """DuplicateObject (role already exists) is treated as success."""
    engine, raw, _ = _make_engine(side_effect=pg_errors.DuplicateObject("exists"))
    ok, _ = _execute_ddl(engine, MagicMock())
    assert ok is True
    raw.rollback.assert_not_called()


def test_execute_ddl_duplicate_db_is_ok():
    """DuplicateDatabase (database already exists) is treated as success."""
    engine, raw, _ = _make_engine(side_effect=pg_errors.DuplicateDatabase("exists"))
    ok, _ = _execute_ddl(engine, MagicMock())
    assert ok is True
    raw.rollback.assert_not_called()


def test_execute_ddl_connection_error():
    """Unexpected exception returns (False, message) with no rollback."""
    engine, raw, _ = _make_engine(side_effect=Exception("connection refused"))
    ok, err = _execute_ddl(engine, MagicMock())
    assert ok is False
    assert "connection refused" in err
    raw.rollback.assert_not_called()


def test_add_postgres_user_success(mocker):
    """Both DDL calls succeed — returns (True, '')."""
    mocker.patch(f"{USER_MODULE}._get_engine", return_value=MagicMock())
    mocker.patch(f"{USER_MODULE}._execute_ddl", return_value=(True, ""))
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is True
    assert err == ""


def test_add_postgres_user_create_user_fails(mocker):
    """User creation fails — stops before database creation."""
    mocker.patch(f"{USER_MODULE}._get_engine", return_value=MagicMock())
    mocker.patch(
        f"{USER_MODULE}._execute_ddl",
        return_value=(False, "connection refused"),
    )
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is False
    assert "Failed to create user alice" in err


def test_add_postgres_user_db_creation_fails(mocker):
    """User created but database creation fails."""
    mocker.patch(f"{USER_MODULE}._get_engine", return_value=MagicMock())
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
