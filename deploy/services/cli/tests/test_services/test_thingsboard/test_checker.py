"""Tests for ThingsBoard checker module."""

from unittest.mock import Mock
import pytest
import click
from dtaas_services.pkg.services.thingsboard import checker
# pylint: disable=W0212, W0621


@pytest.fixture
def mock_docker():
    """Mock Docker client"""
    mock = Mock()
    mock.execute = Mock()
    mock.container = Mock()
    mock.container.list = Mock()
    return mock


@pytest.fixture
def mock_console():
    """Mock Rich console"""
    return Mock()


def test_query_thingsboard_schema_exception(mock_docker):
    """Test schema query with exception"""
    mock_docker.execute.side_effect = Exception("DB error")
    assert checker._query_thingsboard_schema(mock_docker) is False


def test_find_thingsboard_containers_exception(mock_docker):
    """Test finding containers with exception"""
    mock_docker.container.list.side_effect = Exception("Docker error")
    result = checker._find_thingsboard_containers(mock_docker)
    assert result == []


def test_is_thingsboard_installed_false_no_postgres(mock_docker):
    """Test ThingsBoard check with no Postgres"""
    container_map = {}
    assert checker.is_thingsboard_installed(mock_docker, container_map) is False


def test_confirm_continue_without_thingsboard_no(mocker):
    """Test user cancels operation"""
    mocker.patch("sys.stdin.isatty", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.checker.is_ci", return_value=False
    )
    mocker.patch("click.confirm", return_value=False)
    with pytest.raises(click.ClickException):
        checker._confirm_continue_without_thingsboard()


def test_check_thingsboard_installation_not_needed(mock_docker):
    """Test check when ThingsBoard not in service list"""
    container_map = {}
    checker.check_thingsboard_installation(
        mock_docker, container_map, ["postgres", "influxdb"]
    )


def test_check_thingsboard_installation_already_installed(mock_docker):
    """Test check when ThingsBoard already installed"""
    mock_container = Mock()
    mock_container.state.status = "running"
    container_map = {"postgres": mock_container}
    mock_docker.execute.return_value = "t"
    checker.check_thingsboard_installation(mock_docker, container_map, None)


def test_check_thingsboard_installation_needs_install(
    mock_docker, mock_console, mocker
):
    """Test check when ThingsBoard needs installation"""
    mock_container = Mock()
    mock_container.state.status = "running"
    container_map = {"postgres": mock_container}
    mock_docker.execute.return_value = "f"

    mock_cls = mocker.patch("dtaas_services.pkg.services.thingsboard.checker.Console")
    mock_cls.return_value = mock_console
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.checker.is_ci", return_value=True
    )
    checker.check_thingsboard_installation(mock_docker, container_map, None)
    assert mock_console.print.call_count >= 2


def test_check_postgres_dependency_no_check_needed():
    """Test dependency check when not needed"""
    mock_service = Mock()
    mock_service.docker = Mock()
    err, msg = checker.check_postgres_dependency(mock_service, None)
    assert err is None
    assert msg is None


def test_check_postgres_dependency_thingsboard_not_running():
    """Test dependency check when ThingsBoard not running"""
    mock_service = Mock()
    mock_docker = Mock()
    stopped = Mock()
    stopped.state.status = "exited"
    mock_docker.container.list.return_value = [stopped]
    mock_service.docker = mock_docker

    err, msg = checker.check_postgres_dependency(mock_service, ["postgres"])
    assert err is None
    assert msg is None


def test_check_postgres_dependency_thingsboard_running():
    """Test dependency check when ThingsBoard is running"""
    mock_service = Mock()
    mock_docker = Mock()
    running = Mock()
    running.state.status = "running"
    mock_docker.container.list.return_value = [running]
    mock_service.docker = mock_docker

    err, msg = checker.check_postgres_dependency(mock_service, ["postgres"])
    assert err is not None
    assert isinstance(err, ValueError)
    assert "Cannot remove PostgreSQL" in str(msg)
