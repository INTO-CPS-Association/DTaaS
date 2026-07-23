"""Tests for the user-input resolution/validation helpers in cmd_user_utils.py."""

import click
import pytest
from src.cmd_user_utils import (
    UserAddInput,
    reject_starting_users,
    resolve_usernames,
    stage_users_for_add,
)
from src.pkg.registry import load_registry


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


def test_stage_single_user_registers(tmp_path, monkeypatch):
    """A valid single-user add writes the user into the registry."""
    monkeypatch.chdir(tmp_path)
    added = stage_users_for_add(
        UserAddInput("alice", None, "a@intocps.org", ("team",), False)
    )

    assert added == ["alice"]
    store = load_registry()
    assert store["alice"]["email"] == "a@intocps.org"
    assert store["alice"]["groups"] == ["team"]
    assert store["alice"]["load_balance"] is False
    assert store["alice"]["desired_status"] == "running"


def test_stage_returns_only_newly_added(tmp_path, monkeypatch):
    """stage_users_for_add returns just the new users, not skipped duplicates."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))

    added = stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))

    assert added == []


def test_stage_single_user_defaults_group_to_additional(tmp_path, monkeypatch):
    """With no --group, a single-user add defaults the group to 'additional',
    matching the CSV import path."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))

    assert load_registry()["alice"]["groups"] == ["additional"]


def test_stage_skips_duplicate_registry_user(tmp_path, monkeypatch, capsys):
    """A username already in the registry is skipped with a warning, not overwritten."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))
    stage_users_for_add(UserAddInput("alice", None, "changed@intocps.org", (), True))

    assert "'alice' already exists, skipping" in capsys.readouterr().out
    assert load_registry()["alice"]["email"] == "a@intocps.org"


def test_stage_skips_starting_user(tmp_path, monkeypatch, capsys):
    """A username that is a starting user in dtaas.toml is skipped."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text(
        '[[users]]\nusername="alice"\nemail="a@intocps.org"\n'
    )
    stage_users_for_add(UserAddInput("alice", None, "other@intocps.org", (), True))

    assert "'alice' already exists, skipping" in capsys.readouterr().out
    assert load_registry() == {}


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


def test_resolve_usernames_uses_verb_in_message():
    """The 'neither given' error names the caller-supplied verb."""
    with pytest.raises(click.ClickException, match="to pause users"):
        resolve_usernames((), None, verb="pause")


def test_resolve_usernames_omits_all_by_default():
    """'delete' has no --all, so the 'neither given' error must not suggest it."""
    with pytest.raises(click.ClickException) as exc_info:
        resolve_usernames((), None, verb="delete")
    assert "--all" not in str(exc_info.value)


def test_resolve_usernames_mentions_all_when_allowed():
    """The lifecycle verbs (pause/stop/resume) have --all; the error must say so."""
    with pytest.raises(click.ClickException, match="--all"):
        resolve_usernames((), None, verb="stop", allow_all=True)


def test_reject_starting_users_passes_when_no_overlap(tmp_path, monkeypatch):
    """No starting users are targeted: reject_starting_users is a no-op."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text('[[users]]\nusername="alice"\n')

    reject_starting_users(["bob"], "pause")  # must not raise


def test_reject_starting_users_rejects_overlap(tmp_path, monkeypatch):
    """Targeting a dtaas.toml starting user is rejected with a clear error."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text('[[users]]\nusername="alice"\n')

    with pytest.raises(click.ClickException, match="Cannot pause starting user"):
        reject_starting_users(["alice", "bob"], "pause")


def test_reject_starting_users_tolerates_missing_config(tmp_path, monkeypatch):
    """With no dtaas.toml at all, there are no starting users to conflict with."""
    monkeypatch.chdir(tmp_path)

    reject_starting_users(["alice"], "stop")  # must not raise
