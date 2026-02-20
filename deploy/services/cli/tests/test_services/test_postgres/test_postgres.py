"""Tests for PostgreSQL management."""

import time
from pathlib import Path
from unittest.mock import Mock
import pytest
import click
from dtaas_services.pkg.services.postgres import postgres
# pylint: disable=W0212, W0621


def test_setup_postgres_certs_failure(mocker):
    """Test failed Postgres certificate setup"""
    certs_dir = Path("/test/certs")
    mocker.patch(
        "dtaas_services.pkg.services.postgres.postgres.setup_service_certificates",
        return_value=(False, "error"),
    )
    success, _ = postgres.setup_postgres_certs(certs_dir, 999, 999)
    assert success is False


def test_permissions_postgres_missing_certs(mocker):
    """Test Postgres permissions with missing certificates"""
    mocker.patch("pathlib.Path.exists", return_value=False)
    success, msg = postgres.permissions_postgres()
    assert success is False
    assert "not found" in msg


def test_permissions_postgres_exception(mocker):
    """Test Postgres permissions with exception"""
    mocker.patch(
        "dtaas_services.pkg.services.postgres.postgres.setup_postgres_certs",
        side_effect=Exception("Setup error"),
    )
    mocker.patch("pathlib.Path.exists", return_value=True)
    success, _ = postgres.permissions_postgres()
    assert success is False


def test_wait_iteration_ready(mock_console, mock_docker):
    """Test wait iteration when Postgres becomes ready"""
    postgres_container = Mock()
    postgres_container.name = "postgres"
    postgres_container.state.status = "running"
    postgres_container.state.health = "healthy"
    mock_docker.compose.ps.return_value = [postgres_container]

    is_ready, status = postgres._wait_iteration(mock_console, mock_docker, None)
    assert is_ready is True
    assert status == "running"


def test_wait_iteration_exception(mock_console, mock_docker):
    """Test wait iteration with exception"""
    mock_docker.compose.ps.side_effect = Exception("Error")

    is_ready, status = postgres._wait_iteration(mock_console, mock_docker, None)
    assert is_ready is False
    assert status is None


def test_handle_wait_iteration_ready(mock_console, mock_docker, mocker):
    """Test handle wait iteration when ready"""
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, time.time(), None)

    mocker.patch(
        "dtaas_services.pkg.services.postgres.postgres._wait_iteration",
        return_value=(True, "running"),
    )
    result = postgres._handle_wait_iteration(ctx)
    assert result is True


def test_handle_wait_iteration_not_ready(mock_console, mock_docker, mocker):
    """Test handle wait iteration when not ready"""
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, time.time(), None)

    mocker.patch(
        "dtaas_services.pkg.services.postgres.postgres._wait_iteration",
        return_value=(False, "starting"),
    )
    mocker.patch("time.sleep")
    result = postgres._handle_wait_iteration(ctx)
    assert result is False
    assert ctx.last_status == "starting"


def test_perform_wait_loop_becomes_ready(mock_console, mock_docker, mocker):
    """Test wait loop when Postgres becomes ready"""
    start_time = time.time()
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, start_time, None)

    mocker.patch(
        "dtaas_services.pkg.services.postgres.postgres._handle_wait_iteration",
        return_value=True,
    )
    result = postgres._perform_wait_loop(ctx)
    assert result is None


def test_perform_wait_loop_timeout(mock_console, mock_docker):
    """Test wait loop timeout"""
    start_time = time.time() - 35  # Start 35 seconds ago
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, start_time, None)

    result = postgres._perform_wait_loop(ctx)
    assert result == "timeout"


def test_wait_for_postgres_ready_timeout(mock_console, mock_docker, mocker):
    """Test wait for Postgres ready with timeout"""
    mocker.patch(
        "dtaas_services.pkg.services.postgres.postgres._perform_wait_loop",
        return_value="timeout",
    )
    with pytest.raises(click.ClickException) as exc_info:
        postgres.wait_for_postgres_ready(mock_console, mock_docker, 15)
    assert "15 seconds" in str(exc_info.value)
