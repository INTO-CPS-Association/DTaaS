"""Tests for the .dtaas.state.json runtime state cache."""

import json
from unittest.mock import patch, MagicMock
from python_on_whales.exceptions import DockerException
from src.pkg.state import (
    config_hash,
    build_state,
    write_state,
    load_state,
    find_drift,
    _service_facts,
)
# pylint: disable=protected-access


def test_config_hash_is_stable_and_order_independent():
    """config_hash ignores key order and changes when the config changes."""
    assert config_hash({"a": 1, "b": 2}) == config_hash({"b": 2, "a": 1})
    assert config_hash({"a": 1}) != config_hash({"a": 2})
    assert config_hash({}).startswith("sha256:")


def test_build_state_merges_facts_and_hash():
    """build_state records the container facts and config hash per user."""
    state = build_state({"alice": {"image": "x"}}, {"alice": ("cid123", "running")})

    entry = state["alice"]
    assert entry["container_id"] == "cid123"
    assert entry["status"] == "running"
    assert entry["config_hash"] == config_hash({"image": "x"})
    assert entry["provisioned_at"]


def test_build_state_defaults_missing_facts_to_none():
    """Users without a live container get null container facts, still hashed."""
    state = build_state({"bob": {"image": "y"}}, {})

    assert state["bob"]["container_id"] is None
    assert state["bob"]["status"] is None
    assert state["bob"]["config_hash"].startswith("sha256:")


def test_write_state_writes_file(tmp_path):
    """write_state serialises the state mapping to the given path."""
    path = tmp_path / ".dtaas.state.json"
    with patch("src.pkg.state._service_facts", return_value={}):
        write_state({"alice": {"image": "x"}}, str(path))

    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["alice"]["config_hash"].startswith("sha256:")


def test_service_facts_maps_service_label_to_container(tmp_path):
    """_service_facts keys facts by the compose service label."""
    container = MagicMock()
    container.id = "cid1"
    container.state.status = "running"
    container.config.labels = {"com.docker.compose.service": "alice"}
    client = MagicMock()
    client.compose.ps.return_value = [container]

    with patch("src.pkg.state.DockerClient", return_value=client):
        facts = _service_facts()

    assert facts == {"alice": ("cid1", "running")}


def test_service_facts_returns_empty_on_docker_error():
    """A Docker failure degrades to an empty fact mapping (best-effort)."""
    with patch(
        "src.pkg.state.DockerClient",
        side_effect=DockerException(["docker", "compose", "ps"], 1),
    ):
        assert _service_facts() == {}


def test_load_state_empty_when_absent(tmp_path):
    """A missing state cache reads as an empty mapping."""
    assert load_state(str(tmp_path / "nope.json")) == {}


def test_load_state_reads_file(tmp_path):
    """load_state returns the recorded per-user facts."""
    path = tmp_path / ".dtaas.state.json"
    path.write_text(
        json.dumps({"alice": {"config_hash": "sha256:x"}}), encoding="utf-8"
    )

    assert load_state(str(path))["alice"]["config_hash"] == "sha256:x"


def test_find_drift_detects_missing_unexpected_drifted():
    """find_drift classifies missing, unexpected, and drifted users.

    'alice' is registered and provisioned but her live config no longer
    matches what was recorded (drifted). 'bob' is registered but not
    provisioned at all (missing). 'carol' is provisioned but not registered
    (unexpected).
    """
    registry_users = {"alice": {}, "bob": {}}
    services = {"alice": {"image": "v2"}, "carol": {"image": "c"}}
    state = {"alice": {"config_hash": config_hash({"image": "v1"})}}

    report = find_drift(registry_users, state, services)

    assert report["missing"] == ["bob"]
    assert report["unexpected"] == ["carol"]
    assert report["drifted"] == ["alice"]


def test_find_drift_in_sync():
    """A registry matching the live compose services reports no drift."""
    registry_users = {"alice": {}}
    services = {"alice": {"image": "v1"}}
    state = {"alice": {"config_hash": config_hash({"image": "v1"})}}

    assert find_drift(registry_users, state, services) == {
        "missing": [],
        "unexpected": [],
        "drifted": [],
    }


def test_find_drift_skips_unrecorded_config_hash():
    """A registered, provisioned user with no entry in the state cache is not
    flagged as drifted -- there is nothing to compare against."""
    registry_users = {"alice": {}}
    services = {"alice": {"image": "v1"}}

    report = find_drift(registry_users, {}, services)

    assert report == {"missing": [], "unexpected": [], "drifted": []}
