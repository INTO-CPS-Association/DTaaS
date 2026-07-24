"""Tests for the per-user lifecycle operations in users_lifecycle.py."""

from unittest.mock import MagicMock, patch
import pytest
from src.pkg import users_lifecycle
# pylint: disable=protected-access,redefined-outer-name


def _fake_container(service, paused=False, status="running"):
    """A stand-in for a python-on-whales Container with the fields used."""
    container = MagicMock()
    container.name = service
    container.config.labels = {"com.docker.compose.service": service}
    container.state.paused = paused
    container.state.status = status
    return container


@pytest.fixture
def mock_registry():
    """Patch the registry store functions users_lifecycle calls."""
    with patch("src.pkg.users_lifecycle.load_registry") as mock_load, patch(
        "src.pkg.users_lifecycle.set_desired_status"
    ) as mock_set:
        mock_load.return_value = {
            "alice": {"email": "a@x.io"},
            "bob": {"email": "b@x.io"},
        }
        yield {"load": mock_load, "set_status": mock_set}


@pytest.fixture
def mock_services():
    """Patch _load_services to return a fixed compose.users.yml services dict."""
    with patch(
        "src.pkg.users_lifecycle._load_services",
        return_value={"alice": {}, "bob": {}},
    ) as mock_load:
        yield mock_load


@pytest.fixture
def mock_state():
    """Patch write_state so no real file I/O or docker calls happen."""
    with patch("src.pkg.users_lifecycle.write_state") as mock_write:
        yield mock_write


def test_load_services_empty_when_compose_absent():
    """_load_services returns {} when compose.users.yml has never been written."""
    with patch("src.pkg.users_lifecycle.utils.import_yaml", return_value=({}, None)):
        assert users_lifecycle._load_services() == {}


def test_pause_targets_only_pauses_running_containers():
    """_pause_targets skips an already-paused container so compose does not error."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", paused=False, status="running"),
        _fake_container("bob", paused=True),  # already paused -> skipped
    ]
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        users_lifecycle._pause_targets(["alice", "bob"])

    client.compose.pause.assert_called_once_with(services=["alice"])


def test_stop_targets_skips_already_stopped():
    """_stop_targets stops running/paused containers and skips exited ones."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", status="running"),
        _fake_container("bob", status="exited"),  # already stopped -> skipped
    ]
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        users_lifecycle._stop_targets(["alice", "bob"])

    client.compose.stop.assert_called_once_with(services=["alice"])


def test_pause_targets_noop_without_compose_file():
    """_pause_targets is a no-op when compose.users.yml does not exist."""
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=None):
        users_lifecycle._pause_targets(["alice"])  # must not raise


def test_live_states_empty_targets_skips_ps():
    """_live_states returns {} without calling ps for an empty target list."""
    client = MagicMock()

    assert users_lifecycle._live_states(client, []) == {}
    client.compose.ps.assert_not_called()


def test_resume_targets_unpauses_and_starts_as_appropriate():
    """_resume_targets unpauses paused containers and starts stopped ones,
    leaving already-running ones untouched."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", paused=True),
        _fake_container("bob", status="exited"),
        _fake_container("carol", status="running"),
    ]
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        users_lifecycle._resume_targets(["alice", "bob", "carol"])

    client.compose.unpause.assert_called_once_with(services=["alice"])
    client.compose.start.assert_called_once_with(services=["bob"])


def test_desired_status_drift_reports_mismatches():
    """desired_status_drift lists provisioned users whose live state differs."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", status="running"),  # desired paused -> drift
        _fake_container("bob", paused=True),  # desired paused -> in sync
    ]
    with patch(
        "src.pkg.users_lifecycle.load_registry",
        return_value={
            "alice": {"desired_status": "paused"},
            "bob": {"desired_status": "paused"},
            "carol": {"desired_status": "running"},  # no container -> omitted
        },
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        drift = users_lifecycle.desired_status_drift()

    assert drift == [("alice", "paused", "running")]


def test_missing_containers_flags_running_users_without_a_container():
    """A registry user desired 'running' with no live container is reported;
    a running one, and a user intentionally stopped/paused, are not."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", status="running"),  # present -> not missing
    ]
    with patch(
        "src.pkg.users_lifecycle.load_registry",
        return_value={
            "alice": {"desired_status": "running"},  # has container
            "bob": {"desired_status": "running"},  # no container -> missing
            "carol": {"desired_status": "stopped"},  # no container, but by design
        },
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        assert users_lifecycle.missing_containers() == ["bob"]


def test_missing_containers_empty_without_compose_file():
    """missing_containers returns [] when Docker/compose is unreachable, so a
    transient outage is not mistaken for absent containers."""
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=None):
        assert users_lifecycle.missing_containers() == []


def test_enforce_desired_status_applies_each_action(mock_state):
    """enforce_desired_status pauses/stops/resumes users to match desired_status."""
    drift = [
        ("alice", "paused", "running"),
        ("bob", "stopped", "running"),
        ("carol", "running", "paused"),
    ]
    with patch(
        "src.pkg.users_lifecycle.desired_status_drift", return_value=drift
    ), patch("src.pkg.users_lifecycle._pause_targets") as mp, patch(
        "src.pkg.users_lifecycle._stop_targets"
    ) as ms, patch("src.pkg.users_lifecycle._resume_targets") as mr, patch(
        "src.pkg.users_lifecycle._load_services", return_value={}
    ):
        acted = users_lifecycle.enforce_desired_status()

    mp.assert_called_once_with(["alice"])
    ms.assert_called_once_with(["bob"])
    mr.assert_called_once_with(["carol"])
    assert acted == drift


def test_enforce_desired_status_noop_when_in_sync(mock_state):
    """enforce_desired_status does nothing (no state write) when there is no drift."""
    with patch("src.pkg.users_lifecycle.desired_status_drift", return_value=[]), patch(
        "src.pkg.users_lifecycle._pause_targets"
    ) as mp:
        acted = users_lifecycle.enforce_desired_status()

    mp.assert_called_once_with([])
    mock_state.assert_not_called()
    assert acted == []


def test_pause_users_end_to_end(mock_registry, mock_services, mock_state):
    """pause_users drives the pause action and reports the right desired_status."""
    with patch("src.pkg.users_lifecycle._pause_targets") as mock_pause:
        acted, unregistered, not_provisioned = users_lifecycle.pause_users(
            ["alice", "ghost"]
        )

    mock_pause.assert_called_once_with(["alice"])
    assert acted == ["alice"]
    assert unregistered == ["ghost"]
    assert not_provisioned == []
    mock_registry["set_status"].assert_called_once_with(["alice"], "paused")


def test_stop_users_end_to_end(mock_registry, mock_services, mock_state):
    """stop_users drives the stop action and reports the right desired_status."""
    with patch("src.pkg.users_lifecycle._stop_targets") as mock_stop:
        users_lifecycle.stop_users(["alice"])

    mock_stop.assert_called_once_with(["alice"])
    mock_registry["set_status"].assert_called_once_with(["alice"], "stopped")


def test_resume_users_end_to_end(mock_registry, mock_services, mock_state):
    """resume_users drives the resume action and marks the user 'running' again."""
    with patch("src.pkg.users_lifecycle._resume_targets") as mock_resume:
        users_lifecycle.resume_users(["alice"])

    mock_resume.assert_called_once_with(["alice"])
    mock_registry["set_status"].assert_called_once_with(["alice"], "running")
