"""Tests for GitLab container health checking (health.py)."""

from unittest.mock import Mock
import pytest
from python_on_whales.exceptions import DockerException
from conftest import make_mock_container
from dtaas_services.pkg.services.gitlab import health
# pylint: disable=W0212, W0621

HEALTH = "dtaas_services.pkg.services.gitlab.health"


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


@pytest.fixture
def gitlab_container(mocker):
    """GitLab container returned by the compose listing"""
    container = Mock()
    container.name = "gitlab"
    mocker.patch(f"{HEALTH}._get_gitlab_container", return_value=container)
    return container


@pytest.fixture
def mock_ready(mocker):
    """Mock the in-container readiness check"""
    return mocker.patch(f"{HEALTH}.is_gitlab_ready", return_value=True)


@pytest.mark.parametrize(
    "case",
    [
        ("healthy", True, "healthy"),
        ("healthy", False, "unhealthy"),
        ("starting", True, "starting"),
        ("unhealthy", True, "unhealthy"),
    ],
)
def test_is_gitlab_healthy_needs_docker_health_and_readiness(
    mock_docker, gitlab_container, mock_ready, case
):
    """Healthy means Docker says healthy and GitLab itself is ready; a failed
    readiness check is an outage or a boot in progress, shown as unhealthy"""
    docker_status, ready, expected = case
    gitlab_container.state.health.status = docker_status
    mock_ready.return_value = ready
    assert health.is_gitlab_healthy(mock_docker) == expected


@pytest.mark.parametrize(
    "result, expected",
    [
        ((True, '{"status":"ok","master_check":[{"status":"ok"}]}'), True),
        ((True, '{"status":"failed"}'), False),
        ((True, "<html>502 Bad Gateway</html>"), False),
        ((True, "[]"), False),
        ((False, "Docker error: curl: (7) Failed to connect"), False),
    ],
)
def test_is_gitlab_ready(mocker, result, expected):
    """Only an 'ok' readiness answer from inside the container counts"""
    exec_mock = mocker.patch(f"{HEALTH}.execute_docker_command", return_value=result)
    assert health.is_gitlab_ready() is expected
    container, cmd, options = exec_mock.call_args.args
    assert container == "gitlab"
    assert cmd == ["curl", "-sk", "--max-time", "10", health.GITLAB_READINESS_URL]
    assert options.verbose is False


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


@pytest.mark.parametrize(
    "case",
    [
        (("gitlab", "running", "healthy"), False, {"gitlab": "unhealthy"}),
        (("gitlab", "running", "healthy"), True, {}),
        (("gitlab", "running", "starting"), False, {}),
        (("gitlab", "exited", "healthy"), False, {}),
        (("grafana", "running", "healthy"), False, {}),
    ],
)
def test_status_overrides(mock_ready, case):
    """Only a running GitLab that Docker calls healthy is checked for readiness"""
    container_args, ready, expected = case
    mock_ready.return_value = ready
    containers = [make_mock_container(*container_args)]
    assert health.status_overrides(containers) == expected
    checked = container_args == ("gitlab", "running", "healthy")
    assert mock_ready.called is checked
