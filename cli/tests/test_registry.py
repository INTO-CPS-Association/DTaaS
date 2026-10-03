"""Tests for the CLI-owned user registry store."""

import json
from unittest.mock import patch
import pytest
from src.pkg.registry import (
    load_registry,
    load_starting_gitlab,
    register_new_users,
    register_starting_users,
    remove_from_registry,
    set_desired_status,
    set_gitlab_pat_issued,
    set_gitlab_projects_created,
    set_gitlab_user_ids,
    _partition_new,
)
# pylint: disable=protected-access

USERS_CSV = (
    "username,email,groups,load_balance\n"
    "alice,alice@intocps.org,additional,true\n"
    "bob,bob@intocps.org,additional;beta-testers,false\n"
)


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


def test_remove_from_registry_drops_named_users(tmp_path):
    """remove_from_registry deletes the named users and reports what was removed."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {}, "bob": {}}, [], path)

    removed = remove_from_registry(["alice", "ghost"], path)

    assert removed == ["alice"]
    assert set(load_registry(path)) == {"bob"}


def test_set_desired_status_updates_only_known_users(tmp_path):
    """set_desired_status updates registry members, silently skips unknown names."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "a@x.io"}}, [], path)

    updated = set_desired_status(["alice", "ghost"], "paused", path)

    assert updated == ["alice"]
    assert load_registry(path)["alice"]["desired_status"] == "paused"


def test_set_desired_status_rejects_invalid_status(tmp_path):
    """An unrecognised status is rejected rather than silently written."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {}}, [], path)

    with pytest.raises(ValueError, match="Invalid desired_status"):
        set_desired_status(["alice"], "sleeping", path)


def test_set_gitlab_user_ids_updates_only_known_users(tmp_path):
    """set_gitlab_user_ids updates registry members, silently skips unknown
    names."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "a@x.io"}}, [], path)

    updated = set_gitlab_user_ids({"alice": 42, "ghost": 99}, path)

    assert updated == ["alice"]
    assert load_registry(path)["alice"]["gitlab_user_id"] == 42


def test_set_gitlab_pat_issued_marks_only_known_users(tmp_path):
    """set_gitlab_pat_issued flags registry members True, skips unknown names."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "a@x.io"}}, [], path)

    updated = set_gitlab_pat_issued(["alice", "ghost"], path)

    assert updated == ["alice"]
    assert load_registry(path)["alice"]["gitlab_pat_issued"] is True


def test_set_gitlab_projects_created_is_tracked_apart_from_the_pat(tmp_path):
    """The project marker is its own field, so a user whose PAT was issued but
    whose projects failed is still retried for the projects alone."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "a@x.io"}}, [], path)
    set_gitlab_pat_issued(["alice"], path)

    updated = set_gitlab_projects_created(["alice", "ghost"], path)

    assert updated == ["alice"]
    details = load_registry(path)["alice"]
    assert details["gitlab_projects_created"] is True
    assert details["gitlab_pat_issued"] is True


def test_register_starting_users_keeps_them_out_of_the_user_store(tmp_path):
    """A starting user is tracked in its own section: every name in the user
    store becomes a compose.users.yml service, and a starting user already
    has a container from docker-compose.yml."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "a@x.io"}}, [], path)

    added = register_starting_users(["foo", "bar"], path)

    assert added == ["foo", "bar"]
    assert set(load_registry(path)) == {"alice"}
    assert set(load_starting_gitlab(path)) == {"foo", "bar"}


def test_register_starting_users_is_idempotent(tmp_path):
    """A second run keeps the markers the first one recorded."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_starting_users(["foo"], path)
    set_gitlab_user_ids({"foo": 7}, path)

    assert register_starting_users(["foo"], path) == []
    assert load_starting_gitlab(path)["foo"]["gitlab_user_id"] == 7


def test_writing_one_section_keeps_the_other(tmp_path):
    """Writing either section preserves the whole document, so a user add
    that touches both does not drop half of it."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_starting_users(["foo"], path)

    register_new_users({"alice": {"email": "a@x.io"}}, [], path)
    remove_from_registry(["alice"], path)

    assert set(load_starting_gitlab(path)) == {"foo"}


def test_gitlab_markers_route_to_the_section_holding_the_user(tmp_path):
    """The marker setters find a user in either section, so a starting user's
    half-done run is retried the same way an additional user's is."""
    path = str(tmp_path / "dtaas.users.registry.json")
    register_new_users({"alice": {"email": "a@x.io"}}, [], path)
    register_starting_users(["foo"], path)

    updated = set_gitlab_user_ids({"alice": 42, "foo": 7, "ghost": 99}, path)
    set_gitlab_pat_issued(["alice", "foo"], path)
    set_gitlab_projects_created(["foo"], path)

    assert sorted(updated) == ["alice", "foo"]
    assert load_registry(path)["alice"]["gitlab_user_id"] == 42
    markers = load_starting_gitlab(path)["foo"]
    assert markers == {
        "gitlab_user_id": 7,
        "gitlab_pat_issued": True,
        "gitlab_projects_created": True,
    }


def test_a_foreign_top_level_key_survives_a_write(tmp_path):
    """Only the section being written is replaced: an unknown key left by a
    newer CLI is not dropped by an older one."""
    path = tmp_path / "dtaas.users.registry.json"
    path.write_text(json.dumps({"users": {}, "future": {"x": 1}}), encoding="utf-8")

    register_new_users({"alice": {}}, [], str(path))

    assert json.loads(path.read_text(encoding="utf-8"))["future"] == {"x": 1}
