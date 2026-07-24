"""Tests for the CLI-owned user registry store."""

import json
from unittest.mock import patch
import pytest
from src.pkg.registry import (
    load_registry,
    register_new_users,
    remove_from_registry,
    read_csv_users,
    set_desired_status,
    _parse_csv_row,
    _partition_new,
)
# pylint: disable=protected-access

USERS_CSV = (
    "username,email,groups,load_balance\n"
    "alice,alice@intocps.org,additional,true\n"
    "bob,bob@intocps.org,additional;beta-testers,false\n"
)


def test_load_registry_empty_when_absent(tmp_path):
    """A missing registry reads as an empty store, not an error."""
    assert load_registry(str(tmp_path / "nope.json")) == {}


def test_load_registry_reads_user_store(tmp_path):
    """load_registry returns the users mapping from the JSON file."""
    path = tmp_path / "dtaas.users.registry.json"
    path.write_text(
        json.dumps({"users": {"alice": {"email": "alice@intocps.org"}}}),
        encoding="utf-8",
    )

    assert load_registry(str(path))["alice"]["email"] == "alice@intocps.org"


def test_register_new_users_merges_and_persists(tmp_path):
    """register_new_users unions new users into the store and writes atomically."""
    path = str(tmp_path / "dtaas.users.registry.json")

    register_new_users({"alice": {"email": "a@x.io"}}, [], path)
    added, skipped = register_new_users({"bob": {"email": "b@x.io"}}, [], path)

    assert added == ["bob"] and skipped == []
    assert set(load_registry(path)) == {"alice", "bob"}
    assert not (tmp_path / "dtaas.users.registry.json.tmp").exists()


def test_register_new_users_skips_existing_without_overwriting(tmp_path):
    """A name already in the registry is skipped, keeping its original details."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "old@x.io"}}, [], path)

    added, skipped = register_new_users(
        {"alice": {"email": "new@x.io"}, "carol": {"email": "c@x.io"}}, [], path
    )

    assert added == ["carol"]
    assert skipped == ["alice"]
    assert load_registry(path)["alice"]["email"] == "old@x.io"


def test_register_new_users_skips_reserved_starting_user(tmp_path):
    """A username that is a starting user (reserved) is never added."""
    path = str(tmp_path / "dtaas.users.registry.json")

    added, skipped = register_new_users({"bob": {"email": "b@x.io"}}, ["bob"], path)

    assert added == [] and skipped == ["bob"]
    assert load_registry(path) == {}


def test_partition_new_splits_known_and_new():
    """_partition_new separates already-known names from genuinely new ones."""
    added, skipped = _partition_new({"alice": {"e": 1}, "bob": {"e": 2}}, {"alice"})

    assert added == {"bob": {"e": 2}}
    assert skipped == ["alice"]


def test_remove_from_registry_drops_named_users(tmp_path):
    """remove_from_registry deletes the named users and reports what was removed."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {}, "bob": {}}, [], path)

    removed = remove_from_registry(["alice", "ghost"], path)

    assert removed == ["alice"]
    assert set(load_registry(path)) == {"bob"}


def test_parse_csv_row_splits_groups_and_reads_load_balance():
    """_parse_csv_row splits ';' groups and parses the boolean load_balance."""
    username, details = _parse_csv_row(
        {
            "username": " bob ",
            "email": "bob@intocps.org",
            "groups": "additional;beta-testers",
            "load_balance": "false",
        }
    )

    assert username == "bob"
    assert details["groups"] == ["additional", "beta-testers"]
    assert details["load_balance"] is False


def test_parse_csv_row_strips_group_names():
    """Whitespace around ';'-separated group tags is trimmed."""
    _, details = _parse_csv_row(
        {"username": "x", "email": "x@y.io", "groups": " a ; b ", "load_balance": ""}
    )
    assert details["groups"] == ["a", "b"]


def test_parse_csv_row_defaults_empty_groups_to_additional():
    """An empty groups cell defaults to ['additional']."""
    _, details = _parse_csv_row(
        {"username": "x", "email": "x@y.io", "groups": "", "load_balance": "true"}
    )
    assert details["groups"] == ["additional"]


def test_parse_csv_row_sets_desired_status_running():
    """A CSV-imported user starts with desired_status 'running'."""
    _, details = _parse_csv_row(
        {"username": "x", "email": "x@y.io", "groups": "", "load_balance": "true"}
    )
    assert details["desired_status"] == "running"


def test_parse_csv_row_rejects_invalid_load_balance():
    """A load_balance value that is neither true nor false is rejected."""
    with pytest.raises(ValueError, match="load_balance"):
        _parse_csv_row(
            {"username": "x", "email": "x@y.io", "groups": "", "load_balance": "yes"}
        )


def test_write_registry_fsyncs_before_replace(tmp_path):
    """The registry temp file is fsync'd before the atomic rename."""
    path = str(tmp_path / "dtaas.users.registry.json")
    with patch("src.pkg.registry.os.fsync") as mock_fsync:
        register_new_users({"alice": {}}, [], path)

    mock_fsync.assert_called_once()


def test_read_csv_users_parses_all_rows(tmp_path):
    """read_csv_users turns every CSV row into a {username: details} entry."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(USERS_CSV, encoding="utf-8")

    users = read_csv_users(str(csv_path))

    assert set(users) == {"alice", "bob"}
    assert users["alice"]["load_balance"] is True
    assert users["bob"]["groups"] == ["additional", "beta-testers"]


def test_read_csv_users_rejects_duplicate_username(tmp_path):
    """A username repeated in the CSV is rejected rather than silently overwritten."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(
        "username,email,groups,load_balance\n"
        "alice,alice@intocps.org,additional,true\n"
        "alice,other@intocps.org,additional,false\n",
        encoding="utf-8",
    )
    csv_file = str(csv_path)

    with pytest.raises(ValueError, match="Duplicate username 'alice'"):
        read_csv_users(csv_file)


def test_set_desired_status_updates_only_known_users(tmp_path):
    """set_desired_status updates registry members, silently skips unknown names."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "a@x.io"}}, [], path)

    updated = set_desired_status(["alice", "ghost"], "paused", path)

    assert updated == ["alice"]
    assert load_registry(path)["alice"]["desired_status"] == "paused"


def test_set_desired_status_preserves_other_fields(tmp_path):
    """Updating desired_status leaves email/groups/load_balance untouched."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users(
        {"alice": {"email": "a@x.io", "groups": ["g"], "load_balance": True}}, [], path
    )

    set_desired_status(["alice"], "stopped", path)

    stored = load_registry(path)["alice"]
    assert stored["email"] == "a@x.io"
    assert stored["groups"] == ["g"]
    assert stored["load_balance"] is True
    assert stored["desired_status"] == "stopped"


def test_set_desired_status_rejects_invalid_status(tmp_path):
    """An unrecognised status is rejected rather than silently written."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {}}, [], path)

    with pytest.raises(ValueError, match="Invalid desired_status"):
        set_desired_status(["alice"], "sleeping", path)


def test_csv_import_round_trips_through_registry(tmp_path):
    """A CSV merged into the registry reads back as the same user store."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(USERS_CSV, encoding="utf-8")
    registry_path = str(tmp_path / "dtaas.users.registry.json")

    register_new_users(read_csv_users(str(csv_path)), [], registry_path)

    assert set(load_registry(registry_path)) == {"alice", "bob"}
