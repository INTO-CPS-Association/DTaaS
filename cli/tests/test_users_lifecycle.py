"""Tests for the per-user lifecycle operations in users_lifecycle.py."""

from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from python_on_whales.exceptions import DockerException
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


def test_snapshot_never_queries_docker_for_a_service_that_does_not_exist():
    """_snapshot filters registry names down to those with an actual
    compose.users.yml service entry before calling 'docker compose ps' --
    passing an unknown service name makes real compose reject the call
    outright (DockerException), and a registry user with no service entry at
    all is exactly the interrupted-'user add' case this is meant to detect,
    not crash on."""
    client = MagicMock()
    client.compose.ps.return_value = [_fake_container("alice", status="running")]
    with patch(
        "src.pkg.users_lifecycle.load_registry",
        return_value={"alice": {}, "ghost": {}},  # ghost has no compose service
    ), patch(
        "src.pkg.users_lifecycle._load_services", return_value={"alice": {}}
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        live, registry, services = users_lifecycle._snapshot()

    client.compose.ps.assert_called_once_with(services=["alice"], all=True)
    assert live == {"alice": "running"}
    assert registry == {"alice": {}, "ghost": {}}
    assert services == {"alice": {}}


def test_snapshot_live_empty_dict_when_compose_absent():
    """_snapshot reports live={} (not None) when compose.users.yml itself is
    absent -- every desired-running registry user is legitimately absent in
    that case, distinct from a Docker daemon being merely unreachable."""
    with patch(
        "src.pkg.users_lifecycle.load_registry", return_value={"alice": {}}
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=None):
        live, registry, services = users_lifecycle._snapshot()

    assert live == {}
    assert registry == {"alice": {}}
    assert services == {}


def test_snapshot_live_none_on_docker_exception():
    """A DockerException while querying live containers (daemon unreachable)
    degrades to live=None -- distinct from {} -- so callers can tell 'nobody
    is running' apart from 'we could not check', matching state.py's
    _service_facts degrade behavior for the same failure mode."""
    client = MagicMock()
    client.compose.ps.side_effect = DockerException(["docker", "compose", "ps"], 1)
    with patch(
        "src.pkg.users_lifecycle.load_registry", return_value={"alice": {}}
    ), patch(
        "src.pkg.users_lifecycle._load_services", return_value={"alice": {}}
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        live, registry, _services = users_lifecycle._snapshot()

    assert live is None
    assert registry == {"alice": {}}


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
    ), patch(
        "src.pkg.users_lifecycle._load_services",
        return_value={"alice": {}, "bob": {}, "carol": {}},
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        drift = users_lifecycle.desired_status_drift()

    assert drift == [("alice", "paused", "running")]


def test_desired_status_drift_scopes_to_output_dir():
    """desired_status_drift reads the given deployment's registry/compose file,
    not whatever happens to be in the current directory."""
    client = MagicMock()
    client.compose.ps.return_value = []
    with patch(
        "src.pkg.users_lifecycle.load_registry", return_value={}
    ) as mock_load, patch(
        "src.pkg.users_lifecycle.deploy._users_client", return_value=client
    ) as mock_client:
        users_lifecycle.desired_status_drift("/opt/dtaas-b")

    mock_client.assert_called_once_with("/opt/dtaas-b")
    mock_load.assert_called_once_with(
        str(Path("/opt/dtaas-b") / "dtaas.users.registry.json")
    )


def test_desired_status_drift_empty_on_docker_exception():
    """desired_status_drift returns [] (not a crash, and not every user
    treated as drifted) when Docker is unreachable."""
    client = MagicMock()
    client.compose.ps.side_effect = DockerException(["docker", "compose", "ps"], 1)
    with patch(
        "src.pkg.users_lifecycle.load_registry",
        return_value={"alice": {"desired_status": "paused"}},
    ), patch(
        "src.pkg.users_lifecycle._load_services", return_value={"alice": {}}
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        assert users_lifecycle.desired_status_drift() == []


def test_reconcile_drift_absent_flags_running_users_without_a_container():
    """A registry user desired 'running' with a compose service but no live
    container is reported as absent; a running one, a user intentionally
    stopped, and a user with no compose service at all (find_drift's
    'missing' job, not this one) are not."""
    client = MagicMock()
    client.compose.ps.return_value = [
        _fake_container("alice", status="running"),  # present -> not absent
    ]
    with patch(
        "src.pkg.users_lifecycle.load_registry",
        return_value={
            "alice": {"desired_status": "running"},  # has container
            "bob": {"desired_status": "running"},  # service exists, container gone
            "carol": {"desired_status": "stopped"},  # service exists, by design
            "dave": {"desired_status": "running"},  # no compose service at all
        },
    ), patch(
        "src.pkg.users_lifecycle._load_services",
        return_value={"alice": {}, "bob": {}, "carol": {}},  # dave excluded
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        _, absent, _ = users_lifecycle.reconcile_drift()

    assert absent == ["bob"]
    client.compose.ps.assert_called_once_with(
        services=["alice", "bob", "carol"], all=True
    )


def test_reconcile_drift_absent_empty_without_compose_file():
    """reconcile_drift's absent list is [] when compose.users.yml has never
    been written (an empty registry has nothing to flag either way)."""
    with patch("src.pkg.users_lifecycle.deploy._users_client", return_value=None):
        _, absent, reachable = users_lifecycle.reconcile_drift()

    assert absent == []
    assert reachable is True


def test_reconcile_drift_scopes_to_output_dir():
    """reconcile_drift reads the given deployment's registry/compose file, not
    whatever happens to be in the current directory -- so
    'config reconcile --output-dir X' run from a different deployment's
    directory does not mix the two deployments' users."""
    client = MagicMock()
    client.compose.ps.return_value = []
    with patch(
        "src.pkg.users_lifecycle.load_registry", return_value={}
    ) as mock_load, patch(
        "src.pkg.users_lifecycle.deploy._users_client", return_value=client
    ) as mock_client:
        users_lifecycle.reconcile_drift("/opt/dtaas-b")

    mock_client.assert_called_once_with("/opt/dtaas-b")
    mock_load.assert_called_once_with(
        str(Path("/opt/dtaas-b") / "dtaas.users.registry.json")
    )


def test_reconcile_drift_single_snapshot_for_both_categories():
    """reconcile_drift computes desired-status drift and absent containers
    from one docker query, not two -- so 'config reconcile' cannot observe
    the deployment at two different instants for the two categories."""
    client = MagicMock()
    client.compose.ps.return_value = [_fake_container("alice", status="running")]
    with patch(
        "src.pkg.users_lifecycle.load_registry",
        return_value={
            "alice": {"desired_status": "paused"},  # running but desired paused
            "bob": {"desired_status": "running"},  # service exists, container gone
        },
    ), patch(
        "src.pkg.users_lifecycle._load_services",
        return_value={"alice": {}, "bob": {}},
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        status_drift, absent, reachable = users_lifecycle.reconcile_drift()

    client.compose.ps.assert_called_once()
    assert status_drift == [("alice", "paused", "running")]
    assert absent == ["bob"]
    assert reachable is True


def test_reconcile_drift_reports_unreachable_on_docker_exception():
    """reconcile_drift degrades to ([], [], False) -- not a crash, and not
    every user flagged -- when Docker is unreachable. The False flag lets the
    caller tell 'state verified, nothing wrong' apart from 'could not check'."""
    client = MagicMock()
    client.compose.ps.side_effect = DockerException(["docker", "compose", "ps"], 1)
    with patch(
        "src.pkg.users_lifecycle.load_registry",
        return_value={"alice": {"desired_status": "running"}},
    ), patch(
        "src.pkg.users_lifecycle._load_services", return_value={"alice": {}}
    ), patch("src.pkg.users_lifecycle.deploy._users_client", return_value=client):
        assert users_lifecycle.reconcile_drift() == ([], [], False)


def test_reconcile_drift_reachable_when_compose_absent():
    """A missing compose.users.yml is 'nothing to observe', not a failure to
    observe -- reconcile_drift reports docker_reachable=True so reconcile can
    still legitimately say 'In sync'."""
    with patch("src.pkg.users_lifecycle.load_registry", return_value={}), patch(
        "src.pkg.users_lifecycle.deploy._users_client", return_value=None
    ):
        assert users_lifecycle.reconcile_drift() == ([], [], True)


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
