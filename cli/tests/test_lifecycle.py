"""Tests for the lifecycle module (platform status / stop / pause / resume)."""

from unittest.mock import patch, MagicMock
import pytest
from python_on_whales.exceptions import DockerException
from src.pkg import lifecycle
# pylint: disable=protected-access


def _fake_container(
    service=None, name="c", status: str | None = "running", paused=False, health=None
):
    """Build a stand-in for a python-on-whales Container with the fields used."""
    container = MagicMock()
    container.name = name
    container.config.labels = {"com.docker.compose.service": service} if service else {}
    container.state.paused = paused
    container.state.status = status
    container.state.health = MagicMock(status=health) if health else None
    return container


def _client_with(containers):
    """A DockerClient stand-in whose compose.ps returns *containers*."""
    client = MagicMock()
    client.compose.ps.return_value = containers
    return client


def test_service_name_prefers_compose_label():
    """_service_name reads the compose service label when present."""
    assert lifecycle._service_name(_fake_container(service="traefik")) == "traefik"


def test_service_name_falls_back_to_container_name():
    """Without a compose label, _service_name uses the container name."""
    container = _fake_container(name="lonely")
    assert lifecycle._service_name(container) == "lonely"


def test_state_name_reports_paused_over_status():
    """A paused container reports 'paused' even though its status is 'running'."""
    assert lifecycle._state_name(_fake_container(paused=True)) == "paused"


def test_state_name_uses_status_when_not_paused():
    """A non-paused container reports its raw status word."""
    assert lifecycle._state_name(_fake_container(status="restarting")) == "restarting"


def test_state_name_maps_exited_to_stopped():
    """Docker's 'exited' status is presented as 'stopped' to match the CLI verb."""
    assert lifecycle._state_name(_fake_container(status="exited")) == "stopped"


def test_state_name_unknown_when_status_missing():
    """A missing status word degrades to 'unknown' rather than an empty string."""
    assert lifecycle._state_name(_fake_container(status=None)) == "unknown"


def test_health_name_none_without_healthcheck():
    """_health_name is None when the container has no healthcheck."""
    assert lifecycle._health_name(_fake_container(health=None)) is None


def test_health_name_reports_health_status():
    """_health_name surfaces the healthcheck status when present."""
    assert lifecycle._health_name(_fake_container(health="healthy")) == "healthy"


def test_collect_status_merges_running_absent_and_users(tmp_path):
    """collect_status reports live services, 'not created' ones, and user rows."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    deployment = _client_with([_fake_container(service="traefik", health="healthy")])
    users = _client_with([_fake_container(service="user-alice", paused=True)])
    with patch("src.pkg.lifecycle.deploy._client", return_value=deployment), patch(
        "src.pkg.lifecycle.deploy.compose_services",
        return_value={"traefik", "client"},
    ), patch("src.pkg.lifecycle.deploy._users_client", return_value=users):
        rows = lifecycle.collect_status(str(tmp_path))

    by_service = {row["service"]: row for row in rows}
    assert by_service["traefik"]["state"] == "running"
    assert by_service["traefik"]["health"] == "healthy"
    assert by_service["client"]["state"] == "not created"
    assert by_service["client"]["project"] == "deployment"
    assert by_service["user-alice"]["project"] == "users"
    assert by_service["user-alice"]["state"] == "paused"


def test_collect_status_without_user_compose(tmp_path):
    """collect_status omits the user project when compose.users.yml is absent."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch(
        "src.pkg.lifecycle.deploy._client", return_value=_client_with([])
    ), patch(
        "src.pkg.lifecycle.deploy.compose_services", return_value={"traefik"}
    ), patch("src.pkg.lifecycle.deploy._users_client", return_value=None):
        rows = lifecycle.collect_status(str(tmp_path))

    assert [row["service"] for row in rows] == ["traefik"]
    assert rows[0]["state"] == "not created"


def test_collect_status_requires_compose_file(tmp_path):
    """collect_status refuses to report on a deployment that was never generated."""
    directory = str(tmp_path)
    with pytest.raises(OSError, match="docker-compose.yml"):
        lifecycle.collect_status(directory)


def test_running_user_container_count(tmp_path):
    """running_user_container_count returns the number of live user containers."""
    users = _client_with([_fake_container(), _fake_container()])
    with patch("src.pkg.lifecycle.deploy._users_client", return_value=users):
        assert lifecycle.running_user_container_count(str(tmp_path)) == 2


def test_running_user_container_count_absent(tmp_path):
    """running_user_container_count is 0 when there is no user project."""
    with patch("src.pkg.lifecycle.deploy._users_client", return_value=None):
        assert lifecycle.running_user_container_count(str(tmp_path)) == 0


def test_running_user_container_count_excludes_paused(tmp_path):
    """A paused user container must not inflate the 'still running' count.

    ps() without all=True still returns paused containers (only removed/absent
    ones are excluded), so counting its length would tell an operator who just
    paused every user that they are all still "running".
    """
    users = _client_with([_fake_container(paused=True), _fake_container()])
    with patch("src.pkg.lifecycle.deploy._users_client", return_value=users):
        assert lifecycle.running_user_container_count(str(tmp_path)) == 1


def test_stop_acts_on_core_services_only(tmp_path):
    """stop issues 'compose stop' on the core services, never on user containers."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    deployment, users = MagicMock(), MagicMock()
    with patch("src.pkg.lifecycle.deploy._client", return_value=deployment), patch(
        "src.pkg.lifecycle.deploy._users_client", return_value=users
    ):
        lifecycle.stop(str(tmp_path))

    deployment.compose.stop.assert_called_once_with()
    users.compose.stop.assert_not_called()


def test_start_acts_on_core_services_only(tmp_path):
    """start issues 'compose start' on the core services, never on user containers."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    deployment, users = MagicMock(), MagicMock()
    with patch("src.pkg.lifecycle.deploy._client", return_value=deployment), patch(
        "src.pkg.lifecycle.deploy._users_client", return_value=users
    ):
        lifecycle.start(str(tmp_path))

    deployment.compose.start.assert_called_once_with()
    users.compose.start.assert_not_called()


def test_pause_acts_on_core_services_only(tmp_path):
    """pause issues 'compose pause' on the core services, never on user containers."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    deployment, users = MagicMock(), MagicMock()
    with patch("src.pkg.lifecycle.deploy._client", return_value=deployment), patch(
        "src.pkg.lifecycle.deploy._users_client", return_value=users
    ):
        lifecycle.pause(str(tmp_path))

    deployment.compose.pause.assert_called_once_with()
    users.compose.pause.assert_not_called()


def test_unpause_acts_on_core_services_only(tmp_path):
    """unpause issues 'compose unpause' on the core services only."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    deployment, users = MagicMock(), MagicMock()
    with patch("src.pkg.lifecycle.deploy._client", return_value=deployment), patch(
        "src.pkg.lifecycle.deploy._users_client", return_value=users
    ):
        lifecycle.unpause(str(tmp_path))

    deployment.compose.unpause.assert_called_once_with()
    users.compose.unpause.assert_not_called()


def test_stop_requires_compose_file(tmp_path):
    """stop refuses to act without a generated deployment."""
    directory = str(tmp_path)
    with pytest.raises(OSError, match="docker-compose.yml"):
        lifecycle.stop(directory)


def test_pause_propagates_docker_exception(tmp_path):
    """A compose failure during pause surfaces as the real DockerException."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    deployment = MagicMock()
    deployment.compose.pause.side_effect = DockerException(
        ["docker", "compose", "pause"], 1, stderr=b"not running"
    )
    directory = str(tmp_path)
    with patch("src.pkg.lifecycle.deploy._client", return_value=deployment), patch(
        "src.pkg.lifecycle.deploy._users_client", return_value=None
    ):
        with pytest.raises(DockerException):
            lifecycle.pause(directory)
