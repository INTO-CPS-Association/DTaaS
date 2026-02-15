# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard checker module."""

from unittest.mock import patch, Mock, MagicMock
import pytest
import click
import dtaas_services.pkg.services.thingsboard.checker as checker


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


# Test _query_thingsboard_schema
def test_query_thingsboard_schema_success(mock_docker):
    """Test successful schema query"""
    mock_docker.execute.return_value = "t"
    assert checker._query_thingsboard_schema(mock_docker) is True


def test_query_thingsboard_schema_not_found(mock_docker):
    """Test schema not found"""
    mock_docker.execute.return_value = "f"
    assert checker._query_thingsboard_schema(mock_docker) is False


def test_query_thingsboard_schema_exception(mock_docker):
    """Test schema query with exception"""
    mock_docker.execute.side_effect = Exception("DB error")
    assert checker._query_thingsboard_schema(mock_docker) is False


# Test _validate_postgres_for_thingsboard_check
def test_validate_postgres_running():
    """Test validation with running Postgres"""
    mock_container = Mock()
    mock_container.state.status = "running"
    container_map = {"postgres": mock_container}
    assert checker._validate_postgres_for_thingsboard_check(container_map) is True


def test_validate_postgres_not_in_map():
    """Test validation with missing Postgres"""
    container_map = {"other": Mock()}
    assert checker._validate_postgres_for_thingsboard_check(container_map) is False


def test_validate_postgres_not_running():
    """Test validation with non-running Postgres"""
    mock_container = Mock()
    mock_container.state.status = "exited"
    container_map = {"postgres": mock_container}
    assert checker._validate_postgres_for_thingsboard_check(container_map) is False


def test_validate_postgres_no_state():
    """Test validation with container without state"""
    mock_container = Mock(spec=[])
    container_map = {"postgres": mock_container}
    assert checker._validate_postgres_for_thingsboard_check(container_map) is False


# Test _find_thingsboard_containers
def test_find_thingsboard_containers_success(mock_docker):
    """Test finding ThingsBoard containers"""
    mock_containers = [Mock(), Mock()]
    mock_docker.container.list.return_value = mock_containers
    result = checker._find_thingsboard_containers(mock_docker)
    assert result == mock_containers
    mock_docker.container.list.assert_called_once_with(filters={"name": "thingsboard"})


def test_find_thingsboard_containers_exception(mock_docker):
    """Test finding containers with exception"""
    mock_docker.container.list.side_effect = Exception("Docker error")
    result = checker._find_thingsboard_containers(mock_docker)
    assert result == []


# Test _is_container_running
def test_is_container_running_true():
    """Test container running check"""
    mock_container = Mock()
    mock_container.state.status = "running"
    assert checker._is_container_running(mock_container) is True


def test_is_container_running_false():
    """Test container not running"""
    mock_container = Mock()
    mock_container.state.status = "exited"
    assert checker._is_container_running(mock_container) is False


def test_is_container_running_no_state():
    """Test container without state"""
    mock_container = Mock(spec=[])
    assert checker._is_container_running(mock_container) is False


# Test _has_running_container
def test_has_running_container_true():
    """Test list with running container"""
    running = Mock()
    running.state.status = "running"
    stopped = Mock()
    stopped.state.status = "exited"
    assert checker._has_running_container([running, stopped]) is True


def test_has_running_container_false():
    """Test list with no running containers"""
    stopped1 = Mock()
    stopped1.state.status = "exited"
    stopped2 = Mock()
    stopped2.state.status = "exited"
    assert checker._has_running_container([stopped1, stopped2]) is False


def test_has_running_container_empty():
    """Test empty container list"""
    assert checker._has_running_container([]) is False


# Test _is_thingsboard_container_running
def test_is_thingsboard_container_running_true(mock_docker):
    """Test ThingsBoard is running"""
    running = Mock()
    running.state.status = "running"
    mock_docker.container.list.return_value = [running]
    assert checker._is_thingsboard_container_running(mock_docker) is True


def test_is_thingsboard_container_running_false(mock_docker):
    """Test ThingsBoard is not running"""
    stopped = Mock()
    stopped.state.status = "exited"
    mock_docker.container.list.return_value = [stopped]
    assert checker._is_thingsboard_container_running(mock_docker) is False


# Test is_thingsboard_installed
def test_is_thingsboard_installed_true(mock_docker):
    """Test ThingsBoard is installed"""
    mock_container = Mock()
    mock_container.state.status = "running"
    container_map = {"postgres": mock_container}
    mock_docker.execute.return_value = "t"
    assert checker.is_thingsboard_installed(mock_docker, container_map) is True


def test_is_thingsboard_installed_false_no_postgres(mock_docker):
    """Test ThingsBoard check with no Postgres"""
    container_map = {}
    assert checker.is_thingsboard_installed(mock_docker, container_map) is False


def test_is_thingsboard_installed_exception(mock_docker):
    """Test ThingsBoard check with exception"""
    mock_container = Mock()
    mock_container.state.status = "running"
    container_map = {"postgres": mock_container}
    mock_docker.execute.side_effect = Exception("Error")
    assert checker.is_thingsboard_installed(mock_docker, container_map) is False


# Test _should_check_thingsboard
def test_should_check_thingsboard_none():
    """Test check needed when service_list is None"""
    assert checker._should_check_thingsboard(None) is True


def test_should_check_thingsboard_included():
    """Test check needed when thingsboard-ce in list"""
    assert checker._should_check_thingsboard(["postgres", "thingsboard-ce"]) is True


def test_should_check_thingsboard_not_included():
    """Test check not needed when thingsboard-ce not in list"""
    assert checker._should_check_thingsboard(["postgres", "influxdb"]) is False


# Test _prompt_thingsboard_installation
def test_prompt_thingsboard_installation(mock_console):
    """Test ThingsBoard installation prompt"""
    with patch("dtaas_services.pkg.services.thingsboard.checker.Console") as mock_cls:
        mock_cls.return_value = mock_console
        checker._prompt_thingsboard_installation()
        assert mock_console.print.call_count == 2


# Test _confirm_continue_without_thingsboard
def test_confirm_continue_without_thingsboard_yes():
    """Test user confirms continue"""
    with patch("sys.stdin.isatty", return_value=True), patch(
        "dtaas_services.pkg.services.thingsboard.checker.is_ci", return_value=False
    ), patch("click.confirm", return_value=True):
        checker._confirm_continue_without_thingsboard()  # Should not raise


def test_confirm_continue_without_thingsboard_no():
    """Test user cancels operation"""
    with patch("sys.stdin.isatty", return_value=True), patch(
        "dtaas_services.pkg.services.thingsboard.checker.is_ci", return_value=False
    ), patch("click.confirm", return_value=False), pytest.raises(click.ClickException):
        checker._confirm_continue_without_thingsboard()


def test_confirm_continue_without_thingsboard_ci():
    """Test in CI environment"""
    with patch(
        "dtaas_services.pkg.services.thingsboard.checker.is_ci", return_value=True
    ):
        checker._confirm_continue_without_thingsboard()  # Should not raise


# Test check_thingsboard_installation
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


def test_check_thingsboard_installation_needs_install(mock_docker, mock_console):
    """Test check when ThingsBoard needs installation"""
    mock_container = Mock()
    mock_container.state.status = "running"
    container_map = {"postgres": mock_container}
    mock_docker.execute.return_value = "f"

    with patch("dtaas_services.pkg.services.thingsboard.checker.Console") as mock_cls:
        mock_cls.return_value = mock_console
        with patch(
            "dtaas_services.pkg.services.thingsboard.checker.is_ci", return_value=True
        ):
            checker.check_thingsboard_installation(mock_docker, container_map, None)
            assert mock_console.print.call_count >= 2


# Test check_postgres_dependency
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


def test_check_postgres_dependency_with_thingsboard_in_list():
    """Test dependency check when ThingsBoard also being removed"""
    mock_service = Mock()
    mock_service.docker = Mock()
    err, msg = checker.check_postgres_dependency(
        mock_service, ["postgres", "thingsboard"]
    )
    assert err is None
    assert msg is None
