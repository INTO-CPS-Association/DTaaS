"""Tests for ThingsBoard PostgreSQL module."""

import os
from unittest.mock import Mock
from dtaas_services.pkg.services.postgres import status, postgres
# pylint: disable=W0212, W0621


def test_check_pg_isready_tuple_result_success():
    """Test pg_isready tuple result with success"""
    assert status._check_pg_isready_tuple_result(["output", 0]) is True


def test_check_postgres_via_pg_isready_exception(mock_console, mock_docker, mocker):
    """Test pg_isready check with exception"""
    mock_docker.execute.side_effect = Exception("Command failed")
    mocker.patch.dict(os.environ, {"POSTGRES_USER": "postgres"})
    result = status._check_postgres_via_pg_isready(mock_console, mock_docker)
    assert result is False


def test_print_status_change_restarting(mock_console):
    """Test printing status change to restarting"""
    status._print_status_change(mock_console, "restarting", "running")
    mock_console.print.assert_called_once()


def test_print_status_change_no_change(mock_console):
    """Test no print when status unchanged"""
    status._print_status_change(mock_console, "running", "running")
    mock_console.print.assert_not_called()


def test_check_postgres_state_not_running(mock_console, mock_docker):
    """Test checking Postgres state when not running"""
    mock_pg = Mock()
    mock_pg.state.status = "exited"

    ctx = postgres.PostgresCheckContext(mock_console, mock_docker, mock_pg, None)
    current_status, is_ready = status.check_postgres_state(ctx)

    assert current_status == "exited"
    assert is_ready is False


def test_check_postgres_healthy_via_pg_isready(mock_console, mock_docker, mocker):
    """Test Postgres healthy check via pg_isready fallback"""
    mock_postgres = Mock()
    mock_postgres.state.health = None
    mock_docker.execute.return_value = "accepting connections"

    mocker.patch.dict(os.environ, {"POSTGRES_USER": "postgres"})
    result = status._check_postgres_healthy(mock_console, mock_docker, mock_postgres)
    assert result is True
