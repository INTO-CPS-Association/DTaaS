"""Tests for PostgreSQL user management."""

from dtaas_services.pkg.services.postgres.user_management import (
    _add_postgres_user,
    _get_admin_credentials,
    _run_psql,
    setup_postgres_users,
)

USER_MODULE = "dtaas_services.pkg.services.postgres.user_management"
# pylint: disable=W0621


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


def test_add_postgres_user_success(mocker):
    """Both psql calls succeed — returns (True, '')."""
    mocker.patch(
        f"{USER_MODULE}._get_admin_credentials", return_value=("admin", "pass")
    )
    mock_run = mocker.patch(f"{USER_MODULE}._run_psql", return_value=(True, ""))
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is True
    assert err == ""
    assert mock_run.call_count == 2


def test_add_postgres_user_create_user_fails(mocker):
    """User creation fails — stops before database creation."""
    mocker.patch(
        f"{USER_MODULE}._get_admin_credentials", return_value=("admin", "pass")
    )
    mocker.patch(
        f"{USER_MODULE}._run_psql",
        return_value=(False, "connection refused"),
    )
    ok, err = _add_postgres_user("alice", "pass")
    assert ok is False
    assert "Failed to create user alice" in err


def test_setup_postgres_users_success(mocker):
    """Credentials processed successfully returns (True, success message)."""
    mocker.patch(
        f"{USER_MODULE}.process_credentials_file",
        return_value=(True, "PostgreSQL users created successfully"),
    )
    ok, msg = setup_postgres_users()
    assert ok is True
    assert "successfully" in msg
