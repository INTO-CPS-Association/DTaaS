"""Tests for GitLab container health checking (health.py)."""

import time
from unittest.mock import Mock, MagicMock
import pytest
from dtaas_services.pkg.services.gitlab import health
# pylint: disable=W0212, W0621


@pytest.fixture
def mock_docker():
    """Mock Docker client."""
    mock = Mock()
    mock.compose = Mock()
    mock.container = Mock()
    return mock


@pytest.fixture
def mock_console():
    """Mock Rich console."""
    console = Mock()
    console.status = MagicMock()
    return console


def test_get_gitlab_container_found(mock_docker):
    """Test finding the GitLab container."""
    container = Mock()
    container.name = "gitlab"
    mock_docker.compose.ps.return_value = [container]
    result = health._get_gitlab_container(mock_docker)
    assert result is container


def test_get_gitlab_container_exception(mock_docker):
    """Test exception during container listing."""
    mock_docker.compose.ps.side_effect = Exception("Docker error")
    assert health._get_gitlab_container(mock_docker) is None


def test_check_container_health_attribute_error():
    """Test container where health.status raises AttributeError."""
    container = Mock()
    container.state.health = True
    assert health._check_container_health(container) == "unknown state"


def test_poll_gitlab_health_healthy(mocker):
    """Test poll returns True when container is healthy."""
    ctx = health.GitLabWaitContext(
        console=Mock(), docker=Mock(), timeout=300, start_time=time.time()
    )
    container = Mock()
    container.state.health.status = "healthy"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._get_gitlab_container",
        return_value=container,
    )
    spinner = Mock()
    assert health._poll_gitlab_health(ctx, spinner) is True


def test_poll_gitlab_health_not_found(mocker):
    """Test poll returns False when container not found."""
    ctx = health.GitLabWaitContext(
        console=Mock(), docker=Mock(), timeout=300, start_time=time.time()
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._get_gitlab_container",
        return_value=None,
    )
    spinner = Mock()
    assert health._poll_gitlab_health(ctx, spinner) is False


def test_poll_gitlab_health_starting(mocker):
    """Test poll returns False and updates spinner when starting."""
    ctx = health.GitLabWaitContext(
        console=Mock(), docker=Mock(), timeout=300, start_time=time.time()
    )
    container = Mock()
    container.state.health.status = "starting"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._get_gitlab_container",
        return_value=container,
    )
    mocker.patch("dtaas_services.pkg.services.gitlab.health.time.sleep")
    spinner = Mock()
    assert health._poll_gitlab_health(ctx, spinner) is False
    spinner.update.assert_called_once()


def test_run_gitlab_poll_loop_immediate_success(mocker):
    """Test poll loop returns True immediately when healthy."""
    ctx = health.GitLabWaitContext(
        console=Mock(), docker=Mock(), timeout=300, start_time=time.time()
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._poll_gitlab_health",
        return_value=True,
    )
    spinner = Mock()
    assert health._run_gitlab_poll_loop(ctx, spinner) is True


def test_run_gitlab_poll_loop_timeout():
    """Test poll loop returns False on timeout."""
    ctx = health.GitLabWaitContext(
        console=Mock(), docker=Mock(), timeout=0, start_time=time.time() - 1
    )
    spinner = Mock()
    assert health._run_gitlab_poll_loop(ctx, spinner) is False


def test_wait_for_gitlab_ready_success(mock_console, mock_docker, mocker):
    """Test successful wait for GitLab readiness."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._run_gitlab_poll_loop",
        return_value=True,
    )
    mock_console.status.return_value.__enter__ = Mock(return_value=Mock())
    mock_console.status.return_value.__exit__ = Mock(return_value=False)
    result = health.wait_for_gitlab_ready(mock_console, mock_docker, timeout=60)
    assert result is True


def test_wait_for_gitlab_ready_timeout(mock_console, mock_docker, mocker):
    """Test wait for GitLab readiness times out."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._run_gitlab_poll_loop",
        return_value=False,
    )
    mock_console.status.return_value.__enter__ = Mock(return_value=Mock())
    mock_console.status.return_value.__exit__ = Mock(return_value=False)
    result = health.wait_for_gitlab_ready(mock_console, mock_docker, timeout=1)
    assert result is False


def test_is_gitlab_running_true(mocker):
    """Test is_gitlab_running returns True when container is running."""
    container = Mock()
    container.state.status = "running"
    container.name = "gitlab"
    mock_docker = Mock()
    mock_docker.container.list.return_value = [container]
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health.DockerClient",
        return_value=mock_docker,
    )
    assert health.is_gitlab_running() is True


def test_is_gitlab_running_exception(mocker):
    """Test is_gitlab_running returns False on Docker exception."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health.DockerClient",
        side_effect=Exception("Docker not available"),
    )
    assert health.is_gitlab_running() is False
