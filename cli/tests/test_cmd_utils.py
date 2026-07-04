"""Tests for the CLI helper functions in cmd_utils.py."""

import json
from unittest.mock import MagicMock, patch
import click
import pytest
from src.cmd_utils import (
    UserAddInput,
    resolve_delete_usernames,
    stage_users_for_add,
    run_reconcile,
)
from src.pkg.registry import load_registry
from src.pkg.state import config_hash


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
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", ("team",), False))

    store = load_registry()
    assert store["alice"]["email"] == "a@intocps.org"
    assert store["alice"]["groups"] == ["team"]
    assert store["alice"]["load_balance"] is False


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


def test_resolve_delete_usernames_from_positional_args():
    """Positional usernames are returned as-is (as a list)."""
    assert resolve_delete_usernames(("alice", "bob"), None) == ["alice", "bob"]


def test_resolve_delete_usernames_from_csv(tmp_path):
    """--file resolves to the usernames parsed from the CSV, ignoring other columns."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@x.io\nbob,b@x.io\n")

    assert resolve_delete_usernames((), str(csv)) == ["alice", "bob"]


def test_resolve_delete_usernames_rejects_both(tmp_path):
    """Passing both positional usernames and --file is rejected."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@x.io\n")
    csv_file = str(csv)

    with pytest.raises(click.ClickException, match="either USERNAMES or --file"):
        resolve_delete_usernames(("alice",), csv_file)


def test_resolve_delete_usernames_rejects_neither():
    """Passing neither positional usernames nor --file is rejected."""
    with pytest.raises(click.ClickException, match="Provide one or more USERNAMES"):
        resolve_delete_usernames((), None)


def _write_registry(tmp_path, users):
    """Write a dtaas.users.registry.json with the given {name: details} users."""
    (tmp_path / "dtaas.users.registry.json").write_text(
        json.dumps({"users": users}), encoding="utf-8"
    )


def test_run_reconcile_reports_drift(tmp_path, capsys):
    """run_reconcile flags a registered, provisioned user whose compose config
    differs from what the state cache last recorded."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": "sha256:old"}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v2\n", encoding="utf-8"
    )

    run_reconcile(str(tmp_path))

    out = capsys.readouterr().out
    assert "alice" in out and "config changed" in out


def test_run_reconcile_reports_missing_and_unexpected(tmp_path, capsys):
    """run_reconcile flags a registered-but-not-provisioned user (missing) and
    a provisioned-but-unregistered service (unexpected)."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  carol:\n    image: v1\n", encoding="utf-8"
    )

    run_reconcile(str(tmp_path))

    out = capsys.readouterr().out
    assert "alice" in out and "not provisioned" in out
    assert "carol" in out and "not in the registry" in out


def test_run_reconcile_in_sync(tmp_path, capsys):
    """run_reconcile reports 'In sync' when the registry, state, and compose agree."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    stored = config_hash({"image": "v1"})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": stored}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    run_reconcile(str(tmp_path))

    assert "In sync" in capsys.readouterr().out


def test_run_reconcile_fix_reprovisions_missing(tmp_path, capsys):
    """--fix reprovisions when there are missing/drifted users."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})

    with patch("src.cmd_utils.configPkg.Config", return_value=MagicMock()), patch(
        "src.cmd_utils.userPkg.add_users", return_value=None
    ) as mock_add:
        run_reconcile(str(tmp_path), fix=True)

    mock_add.assert_called_once()
    assert "Reprovisioned" in capsys.readouterr().out


def test_run_reconcile_fix_skips_when_in_sync(tmp_path):
    """--fix does not reprovision when there is nothing missing or drifted."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    stored = config_hash({"image": "v1"})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": stored}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    with patch("src.cmd_utils.userPkg.add_users") as mock_add:
        run_reconcile(str(tmp_path), fix=True)

    mock_add.assert_not_called()


def test_run_reconcile_fix_never_touches_unexpected(tmp_path):
    """--fix does not reprovision for an 'unexpected' (unregistered) service alone."""
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  carol:\n    image: v1\n", encoding="utf-8"
    )

    with patch("src.cmd_utils.userPkg.add_users") as mock_add:
        run_reconcile(str(tmp_path), fix=True)

    mock_add.assert_not_called()
