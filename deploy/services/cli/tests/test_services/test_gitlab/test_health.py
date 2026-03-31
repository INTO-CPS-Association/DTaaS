"""Tests for GitLab container health checking (health.py)."""

from unittest.mock import Mock
import pytest
from python_on_whales.exceptions import DockerException
from dtaas_services.pkg.services.gitlab import health
# pylint: disable=W0212, W0621


@pytest.fixture
def mock_docker():
    """Mock Docker client."""
    mock = Mock()
    mock.compose = Mock()
    mock.container = Mock()
    return mock


def test_get_gitlab_container_found(mock_docker):
    """Test finding the GitLab container."""
    container = Mock()
    container.name = "gitlab"
    mock_docker.compose.ps.return_value = [container]
    result = health._get_gitlab_container(mock_docker)
    assert result is container


def test_get_gitlab_container_exception(mock_docker):
    """Test DockerException during container listing returns None."""
    mock_docker.compose.ps.side_effect = DockerException(
        ["docker", "compose", "ps"], 1, b"", b"connection refused"
    )
    assert health._get_gitlab_container(mock_docker) is None


def test_get_gitlab_container_os_error(mock_docker):
    """Test OSError during container listing returns None."""
    mock_docker.compose.ps.side_effect = OSError("Docker socket not found")
    assert health._get_gitlab_container(mock_docker) is None


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
    """Test is_gitlab_running returns False on DockerException."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health.DockerClient",
        side_effect=OSError("Docker socket not found"),
    )
    assert health.is_gitlab_running() is False


def test_is_gitlab_running_docker_exception(mocker):
    """Test is_gitlab_running returns False on DockerException from container.list."""
    mock_docker = Mock()
    mock_docker.container.list.side_effect = DockerException(
        ["docker", "ps"], 1, b"", b"error"
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health.DockerClient",
        return_value=mock_docker,
    )
    assert health.is_gitlab_running() is False


def test_is_gitlab_healthy_healthy(mock_docker, mocker):
    """Test is_gitlab_healthy returns 'healthy' when container is healthy."""
    container = Mock()
    container.name = "gitlab"
    container.state.health.status = "healthy"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._get_gitlab_container",
        return_value=container,
    )
    assert health.is_gitlab_healthy(mock_docker) == "healthy"


def test_is_gitlab_healthy_starting(mock_docker, mocker):
    """Test is_gitlab_healthy returns 'starting' when container is starting."""
    container = Mock()
    container.name = "gitlab"
    container.state.health.status = "starting"
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._get_gitlab_container",
        return_value=container,
    )
    assert health.is_gitlab_healthy(mock_docker) == "starting"


def test_is_gitlab_healthy_not_found(mock_docker, mocker):
    """Test is_gitlab_healthy returns 'not found' when container missing."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._get_gitlab_container",
        return_value=None,
    )
    assert health.is_gitlab_healthy(mock_docker) == "not found"


def test_is_gitlab_healthy_unknown_state(mock_docker, mocker):
    """Test is_gitlab_healthy returns fallback when health is unavailable."""
    container = Mock()
    container.name = "gitlab"
    container.state.health = True
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.health._get_gitlab_container",
        return_value=container,
    )
    assert health.is_gitlab_healthy(mock_docker) == "unknown state"
