"""Tests for the user-input resolution/validation helpers in cmd_user_utils.py."""

import click
import pytest
from src.cmd_user_utils import (
    UserAddInput,
    _passwords_to_add,
    _read_csv_passwords,
    _starting_usernames,
    _users_to_add,
    reject_starting_users,
    resolve_usernames,
    stage_users_for_add,
)
from src.pkg.registry import load_registry
# pylint: disable=protected-access


def test_stage_users_rejects_username_and_file(tmp_path):
    """Passing both a USERNAME and --file is rejected."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@intocps.org\n")
    csv_path = str(csv)
    user_input = UserAddInput("alice", csv_path, None, (), True)
    with pytest.raises(click.ClickException, match="either a USERNAME or --file"):
        stage_users_for_add(user_input)


def test_stage_single_user_requires_email():
    """A single-user add without --email is rejected."""
    user_input = UserAddInput("alice", None, None, (), True)
    with pytest.raises(click.ClickException, match="--email"):
        stage_users_for_add(user_input)


def test_stage_single_user_password_returned_for_added_user(tmp_path, monkeypatch):
    """A single-user add with --password returns it, keyed by username, for
    GitLab provisioning -- and never inside the registry-persisted details."""
    monkeypatch.chdir(tmp_path)
    added, passwords = stage_users_for_add(
        UserAddInput("alice", None, "a@intocps.org", (), True, "S3cur3-p4ss")
    )

    assert added == ["alice"]
    assert passwords == {"alice": "S3cur3-p4ss"}
    store = load_registry()
    assert "password" not in store["alice"]


def test_stage_returns_only_newly_added(tmp_path, monkeypatch):
    """stage_users_for_add returns just the new users, not skipped duplicates."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))

    added, passwords = stage_users_for_add(
        UserAddInput("alice", None, "a@intocps.org", (), True)
    )

    assert not added
    assert not passwords


def test_stage_returns_password_for_already_registered_retry(tmp_path, monkeypatch):
    """Naming an already-registered user again with --password still returns
    their password -- the explicit retry path for a user whose GitLab PAT
    issuance failed on a prior run (add_users targets every username with a
    supplied password, not just newly-added ones)."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))

    added, passwords = stage_users_for_add(
        UserAddInput("alice", None, "a@intocps.org", (), True, "S3cur3-p4ss")
    )

    assert not added  # already registered: skipped, not re-added
    assert passwords == {"alice": "S3cur3-p4ss"}


def test_stage_rejects_invalid_username(tmp_path, monkeypatch):
    """A shell-unsafe username is rejected before registration."""
    monkeypatch.chdir(tmp_path)
    user_input = UserAddInput("bad;rm", None, "a@intocps.org", (), True)
    with pytest.raises(click.ClickException, match="Invalid username"):
        stage_users_for_add(user_input)


def test_stage_rejects_bare_add(tmp_path, monkeypatch):
    """A bare add (no USERNAME, no --file) is rejected with a helpful message."""
    monkeypatch.chdir(tmp_path)
    user_input = UserAddInput(None, None, None, (), True)
    with pytest.raises(click.ClickException, match="Provide a USERNAME"):
        stage_users_for_add(user_input)

    assert load_registry() == {}


def test_starting_usernames_returns_empty_on_config_error(tmp_path, monkeypatch):
    """_starting_usernames returns [] when get_starting_users errors, rather than
    propagating a malformed dtaas.toml error."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text('[users]\nadd = ["user1"]\n')

    assert _starting_usernames() == []


def test_users_to_add_returns_empty_without_username_or_file():
    """_users_to_add returns {} when given neither a CSV file nor a username."""
    assert not _users_to_add(UserAddInput(None, None, None, (), True))


def test_passwords_to_add_reads_from_csv(tmp_path):
    """_passwords_to_add reads the password column via _read_csv_passwords for
    CSV imports (the username-argument path is covered separately)."""
    csv_file = tmp_path / "users.csv"
    csv_file.write_text(
        "username,email,groups,load_balance,password\n"
        "alice,a@x.io,g,true,S3cur3-p4ss\n"
    )

    passwords = _passwords_to_add(UserAddInput(None, str(csv_file), None, (), True))

    assert passwords == {"alice": "S3cur3-p4ss"}


def test_read_csv_passwords_missing_file_raises_click_exception():
    """A missing/unreadable CSV surfaces as a ClickException, not a raw OSError."""
    with pytest.raises(click.ClickException, match="Error importing users file"):
        _read_csv_passwords("does-not-exist.csv")


def test_resolve_usernames_from_positional_args():
    """Positional usernames are returned as-is (as a list)."""
    assert resolve_usernames(("alice", "bob"), None) == ["alice", "bob"]


def test_resolve_usernames_from_csv(tmp_path):
    """--file resolves to the usernames parsed from the CSV, ignoring other columns."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@x.io\nbob,b@x.io\n")

    assert resolve_usernames((), str(csv)) == ["alice", "bob"]


def test_resolve_usernames_rejects_both(tmp_path):
    """Passing both positional usernames and --file is rejected."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@x.io\n")
    csv_file = str(csv)

    with pytest.raises(click.ClickException, match="either USERNAMES or --file"):
        resolve_usernames(("alice",), csv_file)


def test_resolve_usernames_rejects_neither():
    """Passing neither positional usernames nor --file is rejected."""
    with pytest.raises(click.ClickException, match="Provide one or more USERNAMES"):
        resolve_usernames((), None)


def test_reject_starting_users_rejects_overlap(tmp_path, monkeypatch):
    """Targeting a dtaas.toml starting user is rejected with a clear error."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text('[[users]]\nusername="alice"\n')

    with pytest.raises(click.ClickException, match="Cannot pause starting user"):
        reject_starting_users(["alice", "bob"], "pause")
