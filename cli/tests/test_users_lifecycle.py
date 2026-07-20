"""Tests for the per-user lifecycle operations in users_lifecycle.py."""

from unittest.mock import MagicMock, patch
import pytest
from src.pkg import users_lifecycle
# pylint: disable=protected-access,redefined-outer-name


def _fake_container(service, paused):
    """A stand-in for a python-on-whales Container with the fields used."""
    container = MagicMock()
    container.name = service
    container.config.labels = {"com.docker.compose.service": service}
    container.state.paused = paused
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


def test_split_targets_categorizes_names(mock_registry):
    """_split_targets separates provisioned, unregistered, and not-provisioned names."""
    provisioned, unregistered, not_provisioned = users_lifecycle._split_targets(
        ["alice", "bob", "carol"], services={"alice": {}}
    )
    assert provisioned == ["alice"]
    assert unregistered == ["carol"]
    assert not_provisioned == ["bob"]


def test_apply_noop_when_nothing_to_act_on(mock_registry, mock_services, mock_state):
    """_apply skips the compose call, state refresh, and registry write when
    every target is unregistered or not provisioned."""
    mock_registry["load"].return_value = {}
    action = MagicMock()

    acted, unregistered, not_provisioned = users_lifecycle._apply(
        ["ghost"], action, "paused"
    )

    assert acted == []
    assert unregistered == ["ghost"]
    assert not_provisioned == []
    action.assert_not_called()
    mock_state.assert_not_called()
    mock_registry["set_status"].assert_not_called()


def test_apply_runs_action_and_updates_state_and_registry(
    mock_registry, mock_services, mock_state
):
    """_apply drives the compose action, refreshes state, and writes desired_status
    only for the usernames actually acted on."""
    action = MagicMock()

    acted, _, _ = users_lifecycle._apply(["alice"], action, "paused")

    assert acted == ["alice"]
    action.assert_called_once_with(["alice"])
    mock_state.assert_called_once_with({"alice": {}, "bob": {}})
    mock_registry["set_status"].assert_called_once_with(["alice"], "paused")


def test_pause_targets_calls_compose_pause():
    """_pause_targets scopes 'compose pause' to the given services."""
    client = MagicMock()
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        users_lifecycle._pause_targets(["alice"])

    client.compose.pause.assert_called_once_with(services=["alice"])


def test_stop_targets_calls_compose_stop():
    """_stop_targets scopes 'compose stop' to the given services."""
    client = MagicMock()
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        users_lifecycle._stop_targets(["alice"])

    client.compose.stop.assert_called_once_with(services=["alice"])


def test_pause_targets_noop_without_compose_file():
    """_pause_targets is a no-op when compose.users.yml does not exist."""
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=None):
        users_lifecycle._pause_targets(["alice"])  # must not raise


def test_split_by_paused_separates_by_live_state():
    """_split_by_paused reads each container's live state, not desired_status."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", paused=True),
        _fake_container("bob", paused=False),
    ]

    paused, other = users_lifecycle._split_by_paused(client, ["alice", "bob"])

    assert paused == ["alice"]
    assert other == ["bob"]


def test_resume_targets_unpauses_and_starts_as_appropriate():
    """_resume_targets unpauses paused containers and starts stopped ones."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", paused=True),
        _fake_container("bob", paused=False),
    ]
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        users_lifecycle._resume_targets(["alice", "bob"])

    client.compose.unpause.assert_called_once_with(services=["alice"])
    client.compose.start.assert_called_once_with(services=["bob"])


def test_resume_targets_skips_empty_groups():
    """_resume_targets does not call unpause/start with an empty service list."""
    client = MagicMock()
    client.compose.ps.return_value = [_fake_container("alice", paused=True)]
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        users_lifecycle._resume_targets(["alice"])

    client.compose.unpause.assert_called_once_with(services=["alice"])
    client.compose.start.assert_not_called()


def test_resume_targets_noop_without_compose_file():
    """_resume_targets is a no-op when compose.users.yml does not exist."""
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=None):
        users_lifecycle._resume_targets(["alice"])  # must not raise


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
