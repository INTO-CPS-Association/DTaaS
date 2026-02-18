# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for PostgreSQL management."""

import time
from pathlib import Path
from unittest.mock import patch, Mock
import pytest
import click
import dtaas_services.pkg.services.postgres.postgres as postgres


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.services.postgres.postgres.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "POSTGRES_UID": "999",
            "POSTGRES_GID": "999",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


@pytest.fixture
def mock_docker():
    """Mock Docker client"""
    mock = Mock()
    mock.execute = Mock()
    mock.compose = Mock()
    return mock


@pytest.fixture
def mock_console():
    """Mock Rich console"""
    return Mock()


def test_setup_postgres_certs_failure():
    """Test failed Postgres certificate setup"""
    certs_dir = Path("/test/certs")
    with patch(
        "dtaas_services.pkg.services.postgres.postgres.setup_service_certificates",
        return_value=(False, "error"),
    ):
        success, _ = postgres.setup_postgres_certs(certs_dir, 999, 999)
        assert success is False


def test_permissions_postgres_missing_certs(mock_config):
    """Test Postgres permissions with missing certificates"""
    with patch("pathlib.Path.exists", return_value=False):
        success, msg = postgres.permissions_postgres()
        assert success is False
        assert "not found" in msg


def test_permissions_postgres_exception(mock_config):
    """Test Postgres permissions with exception"""
    with patch(
        "dtaas_services.pkg.services.postgres.postgres.setup_postgres_certs",
        side_effect=Exception("Setup error"),
    ), patch("pathlib.Path.exists", return_value=True):
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


def test_handle_wait_iteration_ready(mock_console, mock_docker):
    """Test handle wait iteration when ready"""
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, time.time(), None)

    with patch(
        "dtaas_services.pkg.services.postgres.postgres._wait_iteration",
        return_value=(True, "running"),
    ):
        result = postgres._handle_wait_iteration(ctx)
        assert result is True


def test_handle_wait_iteration_not_ready(mock_console, mock_docker):
    """Test handle wait iteration when not ready"""
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, time.time(), None)

    with patch(
        "dtaas_services.pkg.services.postgres.postgres._wait_iteration",
        return_value=(False, "starting"),
    ), patch("time.sleep"):
        result = postgres._handle_wait_iteration(ctx)
        assert result is False
        assert ctx.last_status == "starting"


def test_perform_wait_loop_becomes_ready(mock_console, mock_docker):
    """Test wait loop when Postgres becomes ready"""
    start_time = time.time()
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, start_time, None)

    with patch(
        "dtaas_services.pkg.services.postgres.postgres._handle_wait_iteration",
        return_value=True,
    ):
        result = postgres._perform_wait_loop(ctx)
        assert result is None


def test_perform_wait_loop_timeout(mock_console, mock_docker):
    """Test wait loop timeout"""
    start_time = time.time() - 35  # Start 35 seconds ago
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, start_time, None)

    result = postgres._perform_wait_loop(ctx)
    assert result == "timeout"


def test_wait_for_postgres_ready_timeout(mock_console, mock_docker):
    """Test wait for Postgres ready with timeout"""
    with patch(
        "dtaas_services.pkg.services.postgres.postgres._perform_wait_loop",
        return_value="timeout",
    ), pytest.raises(click.ClickException) as exc_info:
        postgres.wait_for_postgres_ready(mock_console, mock_docker, 15)
    assert "15 seconds" in str(exc_info.value)
