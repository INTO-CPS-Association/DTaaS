"""Tests for the CLI-owned user registry store."""

import json
from src.pkg.registry import (
    load_registry,
    add_to_registry,
    remove_from_registry,
    read_csv_users,
    _parse_csv_row,
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


def test_add_to_registry_merges_and_persists(tmp_path):
    """add_to_registry unions new users into the store and writes it atomically."""
    path = str(tmp_path / "dtaas.users.registry.json")

    add_to_registry({"alice": {"email": "a@x.io"}}, path)
    store = add_to_registry({"bob": {"email": "b@x.io"}}, path)

    assert set(store) == {"alice", "bob"}
    assert load_registry(path) == store
    assert not (tmp_path / "dtaas.users.registry.json.tmp").exists()


def test_add_to_registry_updates_existing_user(tmp_path):
    """Re-adding a username overwrites that user's details."""
    path = str(tmp_path / "dtaas.users.registry.json")
    add_to_registry({"alice": {"email": "old@x.io"}}, path)

    store = add_to_registry({"alice": {"email": "new@x.io"}}, path)

    assert store["alice"]["email"] == "new@x.io"


def test_remove_from_registry_drops_named_users(tmp_path):
    """remove_from_registry deletes the named users and reports what was removed."""
    path = str(tmp_path / "dtaas.users.registry.json")
    add_to_registry({"alice": {}, "bob": {}}, path)

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


def test_read_csv_users_parses_all_rows(tmp_path):
    """read_csv_users turns every CSV row into a {username: details} entry."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(USERS_CSV, encoding="utf-8")

    users = read_csv_users(str(csv_path))

    assert set(users) == {"alice", "bob"}
    assert users["alice"]["load_balance"] is True
    assert users["bob"]["groups"] == ["additional", "beta-testers"]


def test_csv_import_round_trips_through_registry(tmp_path):
    """A CSV merged into the registry reads back as the same user store."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(USERS_CSV, encoding="utf-8")
    registry_path = str(tmp_path / "dtaas.users.registry.json")

    add_to_registry(read_csv_users(str(csv_path)), registry_path)

    assert set(load_registry(registry_path)) == {"alice", "bob"}
