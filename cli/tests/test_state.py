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


def test_find_drift_detects_changed_untracked_orphaned():
    """find_drift classifies drifted, untracked, and orphaned users."""
    services = {"alice": {"image": "v2"}, "bob": {"image": "b"}}
    state = {
        "alice": {"config_hash": config_hash({"image": "v1"})},  # config changed
        "carol": {"config_hash": "sha256:x"},  # no longer provisioned
    }

    report = find_drift(state, services)

    assert report["drifted"] == ["alice"]
    assert report["untracked"] == ["bob"]
    assert report["orphaned"] == ["carol"]


def test_find_drift_in_sync():
    """A state cache matching the compose services reports no drift."""
    services = {"alice": {"image": "v1"}}
    state = {"alice": {"config_hash": config_hash({"image": "v1"})}}

    assert find_drift(state, services) == {
        "drifted": [],
        "untracked": [],
        "orphaned": [],
    }
