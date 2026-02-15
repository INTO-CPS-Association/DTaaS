# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard PostgreSQL module."""

import os
import time
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
import pytest
import click
import dtaas_services.pkg.services.thingsboard.postgres as postgres


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.services.thingsboard.postgres.Config") as mock:
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


# Test setup_postgres_certs
def test_setup_postgres_certs_success():
    """Test successful Postgres certificate setup"""
    certs_dir = Path("/test/certs")
    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres.setup_service_certificates",
        return_value=(True, "success"),
    ):
        success, msg = postgres.setup_postgres_certs(certs_dir, 999, 999)
        assert success is True


def test_setup_postgres_certs_failure():
    """Test failed Postgres certificate setup"""
    certs_dir = Path("/test/certs")
    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres.setup_service_certificates",
        return_value=(False, "error"),
    ):
        success, msg = postgres.setup_postgres_certs(certs_dir, 999, 999)
        assert success is False


# Test permissions_postgres
def test_permissions_postgres_success(mock_config):
    """Test successful Postgres permissions setup"""
    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres.setup_postgres_certs",
        return_value=(True, "success"),
    ), patch("pathlib.Path.exists", return_value=True):
        success, msg = postgres.permissions_postgres()
        assert success is True


def test_permissions_postgres_missing_certs(mock_config):
    """Test Postgres permissions with missing certificates"""
    with patch("pathlib.Path.exists", return_value=False):
        success, msg = postgres.permissions_postgres()
        assert success is False
        assert "not found" in msg


def test_permissions_postgres_exception(mock_config):
    """Test Postgres permissions with exception"""
    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres.setup_postgres_certs",
        side_effect=Exception("Setup error"),
    ), patch("pathlib.Path.exists", return_value=True):
        success, msg = postgres.permissions_postgres()
        assert success is False


# Test _check_pg_isready_string_result
def test_check_pg_isready_string_result_accepting():
    """Test pg_isready string result with accepting"""
    assert postgres._check_pg_isready_string_result("accepting connections") is True


def test_check_pg_isready_string_result_not_accepting():
    """Test pg_isready string result without accepting"""
    assert postgres._check_pg_isready_string_result("not ready") is False


def test_check_pg_isready_string_result_not_string():
    """Test pg_isready with non-string result"""
    assert postgres._check_pg_isready_string_result([1, 0]) is False


# Test _check_pg_isready_tuple_result
def test_check_pg_isready_tuple_result_success():
    """Test pg_isready tuple result with success"""
    assert postgres._check_pg_isready_tuple_result(["output", 0]) is True


def test_check_pg_isready_tuple_result_failure():
    """Test pg_isready tuple result with failure"""
    assert postgres._check_pg_isready_tuple_result(["output", 1]) is False


def test_check_pg_isready_tuple_result_not_tuple():
    """Test pg_isready with non-tuple result"""
    assert postgres._check_pg_isready_tuple_result("not tuple") is False


def test_check_pg_isready_tuple_result_short_tuple():
    """Test pg_isready with short tuple"""
    assert postgres._check_pg_isready_tuple_result([0]) is False


# Test _check_postgres_via_pg_isready
def test_check_postgres_via_pg_isready_string_success(mock_console, mock_docker):
    """Test pg_isready check with string success"""
    mock_docker.execute.return_value = "accepting connections"
    with patch.dict(os.environ, {"POSTGRES_USER": "postgres"}):
        result = postgres._check_postgres_via_pg_isready(mock_console, mock_docker)
        assert result is True
        mock_console.print.assert_called_once()


def test_check_postgres_via_pg_isready_tuple_success(mock_console, mock_docker):
    """Test pg_isready check with tuple success"""
    mock_docker.execute.return_value = ["output", 0]
    with patch.dict(os.environ, {"POSTGRES_USER": "postgres"}):
        result = postgres._check_postgres_via_pg_isready(mock_console, mock_docker)
        assert result is True


def test_check_postgres_via_pg_isready_failure(mock_console, mock_docker):
    """Test pg_isready check with failure"""
    mock_docker.execute.return_value = "not ready"
    with patch.dict(os.environ, {"POSTGRES_USER": "postgres"}):
        result = postgres._check_postgres_via_pg_isready(mock_console, mock_docker)
        assert result is False


def test_check_postgres_via_pg_isready_exception(mock_console, mock_docker):
    """Test pg_isready check with exception"""
    mock_docker.execute.side_effect = Exception("Command failed")
    with patch.dict(os.environ, {"POSTGRES_USER": "postgres"}):
        result = postgres._check_postgres_via_pg_isready(mock_console, mock_docker)
        assert result is False


# Test _print_status_change
def test_print_status_change_running(mock_console):
    """Test printing status change to running"""
    postgres._print_status_change(mock_console, "running", "starting")
    mock_console.print.assert_called_once()


def test_print_status_change_restarting(mock_console):
    """Test printing status change to restarting"""
    postgres._print_status_change(mock_console, "restarting", "running")
    mock_console.print.assert_called_once()


def test_print_status_change_no_change(mock_console):
    """Test no print when status unchanged"""
    postgres._print_status_change(mock_console, "running", "running")
    mock_console.print.assert_not_called()


def test_print_status_change_other_status(mock_console):
    """Test no print for other status"""
    postgres._print_status_change(mock_console, "exited", "running")
    mock_console.print.assert_not_called()


# Test _get_postgres_container
def test_get_postgres_container_found():
    """Test finding Postgres container"""
    postgres_container = Mock()
    postgres_container.name = "postgres"
    other_container = Mock()
    other_container.name = "influxdb"
    containers = [other_container, postgres_container]

    result = postgres._get_postgres_container(containers)
    assert result == postgres_container


def test_get_postgres_container_not_found():
    """Test Postgres container not found"""
    other_container = Mock()
    other_container.name = "influxdb"
    containers = [other_container]

    result = postgres._get_postgres_container(containers)
    assert result is None


# Test _check_postgres_health_status
def test_check_postgres_health_status_healthy():
    """Test Postgres health status check - healthy"""
    mock_postgres = Mock()
    mock_postgres.state.health = "healthy"
    assert postgres._check_postgres_health_status(mock_postgres) is True


def test_check_postgres_health_status_unhealthy():
    """Test Postgres health status check - unhealthy"""
    mock_postgres = Mock()
    mock_postgres.state.health = "unhealthy"
    assert postgres._check_postgres_health_status(mock_postgres) is False


def test_check_postgres_health_status_no_health():
    """Test Postgres health status check - no health attribute"""
    mock_postgres = Mock()
    mock_postgres.state.health = None
    assert postgres._check_postgres_health_status(mock_postgres) is False


def test_check_postgres_health_status_no_health():
    """Test Postgres health status check - no health attribute"""
    mock_postgres = Mock()
    # State exists but health attribute is None
    mock_postgres.state.health = None
    assert postgres._check_postgres_health_status(mock_postgres) is False


# Test _check_postgres_healthy
def test_check_postgres_healthy_via_health_status(mock_console, mock_docker):
    """Test Postgres healthy check via health status"""
    mock_postgres = Mock()
    mock_postgres.state.health = "healthy"
    result = postgres._check_postgres_healthy(mock_console, mock_docker, mock_postgres)
    assert result is True
    mock_console.print.assert_called_once()


def test_check_postgres_healthy_via_pg_isready(mock_console, mock_docker):
    """Test Postgres healthy check via pg_isready fallback"""
    mock_postgres = Mock()
    mock_postgres.state.health = None
    mock_docker.execute.return_value = "accepting connections"

    with patch.dict(os.environ, {"POSTGRES_USER": "postgres"}):
        result = postgres._check_postgres_healthy(
            mock_console, mock_docker, mock_postgres
        )
        assert result is True


# Test _handle_postgres_timeout_error
def test_handle_postgres_timeout_error(mock_console):
    """Test Postgres timeout error handling"""
    with pytest.raises(click.ClickException) as exc_info:
        postgres._handle_postgres_timeout_error(mock_console, 30)
    assert "30 seconds" in str(exc_info.value)


# Test _check_postgres_state
def test_check_postgres_state_running_healthy(mock_console, mock_docker):
    """Test checking Postgres state when running and healthy"""
    mock_pg = Mock()
    mock_pg.state.status = "running"
    mock_pg.state.health = "healthy"

    ctx = postgres.PostgresCheckContext(mock_console, mock_docker, mock_pg, None)
    current_status, is_ready = postgres._check_postgres_state(ctx)

    assert current_status == "running"
    assert is_ready is True


def test_check_postgres_state_not_running(mock_console, mock_docker):
    """Test checking Postgres state when not running"""
    mock_pg = Mock()
    mock_pg.state.status = "exited"

    ctx = postgres.PostgresCheckContext(mock_console, mock_docker, mock_pg, None)
    current_status, is_ready = postgres._check_postgres_state(ctx)

    assert current_status == "exited"
    assert is_ready is False


def test_check_postgres_state_running_not_healthy(mock_console, mock_docker):
    """Test checking Postgres state when running but not healthy"""
    mock_pg = Mock()
    mock_pg.state.status = "running"
    mock_pg.state.health = "starting"
    mock_docker.execute.return_value = "not ready"

    with patch.dict(os.environ, {"POSTGRES_USER": "postgres"}):
        ctx = postgres.PostgresCheckContext(mock_console, mock_docker, mock_pg, None)
        current_status, is_ready = postgres._check_postgres_state(ctx)

        assert current_status == "running"
        assert is_ready is False


# Test _try_get_postgres_container
def test_try_get_postgres_container_success(mock_docker):
    """Test successfully getting Postgres container"""
    postgres_container = Mock()
    postgres_container.name = "postgres"
    mock_docker.compose.ps.return_value = [postgres_container]

    result = postgres._try_get_postgres_container(mock_docker)
    assert result == postgres_container


def test_try_get_postgres_container_exception(mock_docker):
    """Test getting Postgres container with exception"""
    mock_docker.compose.ps.side_effect = Exception("Docker error")

    result = postgres._try_get_postgres_container(mock_docker)
    assert result is None


# Test _is_postgres_container_valid
def test_is_postgres_container_valid_true():
    """Test valid Postgres container"""
    mock_pg = Mock()
    mock_pg.state = Mock()
    assert postgres._is_postgres_container_valid(mock_pg) is True


def test_is_postgres_container_valid_none():
    """Test Postgres container is None"""
    assert postgres._is_postgres_container_valid(None) is False


def test_is_postgres_container_valid_no_state():
    """Test Postgres container without state"""
    mock_pg = Mock(spec=[])
    assert postgres._is_postgres_container_valid(mock_pg) is False


# Test _get_wait_time_for_status
def test_get_wait_time_for_status_restarting():
    """Test wait time for restarting status"""
    assert postgres._get_wait_time_for_status("restarting") == 3


def test_get_wait_time_for_status_other():
    """Test wait time for other status"""
    assert postgres._get_wait_time_for_status("running") == 2
    assert postgres._get_wait_time_for_status("starting") == 2


# Test _wait_iteration
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


def test_wait_iteration_not_ready(mock_console, mock_docker):
    """Test wait iteration when Postgres not ready"""
    postgres_container = Mock()
    postgres_container.name = "postgres"
    postgres_container.state.status = "starting"
    postgres_container.state.health = None
    mock_docker.compose.ps.return_value = [postgres_container]
    mock_docker.execute.return_value = "not ready"

    with patch.dict(os.environ, {"POSTGRES_USER": "postgres"}):
        is_ready, status = postgres._wait_iteration(mock_console, mock_docker, None)
        assert is_ready is False
        assert status == "starting"


def test_wait_iteration_exception(mock_console, mock_docker):
    """Test wait iteration with exception"""
    mock_docker.compose.ps.side_effect = Exception("Error")

    is_ready, status = postgres._wait_iteration(mock_console, mock_docker, None)
    assert is_ready is False
    assert status is None


# Test _handle_wait_iteration
def test_handle_wait_iteration_ready(mock_console, mock_docker):
    """Test handle wait iteration when ready"""
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, time.time(), None)

    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres._wait_iteration",
        return_value=(True, "running"),
    ):
        result = postgres._handle_wait_iteration(ctx)
        assert result is True


def test_handle_wait_iteration_not_ready(mock_console, mock_docker):
    """Test handle wait iteration when not ready"""
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, time.time(), None)

    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres._wait_iteration",
        return_value=(False, "starting"),
    ), patch("time.sleep"):
        result = postgres._handle_wait_iteration(ctx)
        assert result is False
        assert ctx.last_status == "starting"


# Test _perform_wait_loop
def test_perform_wait_loop_becomes_ready(mock_console, mock_docker):
    """Test wait loop when Postgres becomes ready"""
    start_time = time.time()
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, start_time, None)

    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres._handle_wait_iteration",
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


# Test wait_for_postgres_ready
def test_wait_for_postgres_ready_success(mock_console, mock_docker):
    """Test successful wait for Postgres ready"""
    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres._perform_wait_loop",
        return_value=None,
    ):
        postgres.wait_for_postgres_ready(mock_console, mock_docker, 15)
        mock_console.print.assert_called()


def test_wait_for_postgres_ready_timeout(mock_console, mock_docker):
    """Test wait for Postgres ready with timeout"""
    with patch(
        "dtaas_services.pkg.services.thingsboard.postgres._perform_wait_loop",
        return_value="timeout",
    ), pytest.raises(click.ClickException) as exc_info:
        postgres.wait_for_postgres_ready(mock_console, mock_docker, 15)
    assert "15 seconds" in str(exc_info.value)


# Test PostgresCheckContext
def test_postgres_check_context():
    """Test PostgresCheckContext initialization"""
    mock_console = Mock()
    mock_docker = Mock()
    mock_pg = Mock()
    ctx = postgres.PostgresCheckContext(mock_console, mock_docker, mock_pg, "running")
    assert ctx.console == mock_console
    assert ctx.docker == mock_docker
    assert ctx.postgres == mock_pg
    assert ctx.last_status == "running"


# Test PostgresWaitContext
def test_postgres_wait_context():
    """Test PostgresWaitContext initialization"""
    mock_console = Mock()
    mock_docker = Mock()
    start_time = time.time()
    ctx = postgres.PostgresWaitContext(mock_console, mock_docker, 30, start_time, None)
    assert ctx.console == mock_console
    assert ctx.docker == mock_docker
    assert ctx.timeout == 30
    assert ctx.start_time == start_time
    assert ctx.last_status is None
