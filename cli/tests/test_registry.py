"""Tests for the CLI-owned user registry store."""

import json
from unittest.mock import patch
import pytest
from src.pkg.registry import (
    load_registry,
    register_new_users,
    remove_from_registry,
    read_csv_passwords,
    read_csv_users,
    set_desired_status,
    set_gitlab_pat_issued,
    set_gitlab_user_ids,
    _parse_csv_row,
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


def test_parse_csv_row_rejects_invalid_load_balance():
    """A load_balance value that is neither true nor false is rejected."""
    with pytest.raises(ValueError, match="load_balance"):
        _parse_csv_row(
            {"username": "x", "email": "x@y.io", "groups": "", "load_balance": "yes"}
        )


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


def test_read_csv_passwords_parses_password_column(tmp_path):
    """read_csv_passwords extracts {username: password} for GitLab provisioning."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(
        "username,email,groups,load_balance,password\n"
        "alice,alice@intocps.org,additional,true,S3cur3-p4ss\n"
        "bob,bob@intocps.org,additional,false,An0ther-p4ss\n",
        encoding="utf-8",
    )

    passwords = read_csv_passwords(str(csv_path))

    assert passwords == {"alice": "S3cur3-p4ss", "bob": "An0ther-p4ss"}


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
