"""Tests for the CLI helper functions in cmd_utils.py."""

import json
from unittest.mock import MagicMock, patch
import click
import pytest
from src.cmd_utils import (
    VerticalChoicesCommand,
    _find_toml,
    _certs_src,
    provision_user_files,
    stage_users_for_add,
    run_reconcile,
)
from src.pkg.registry import load_registry
from src.pkg.state import config_hash


def test_param_rows_skips_hidden_param():
    """_param_rows returns no rows for a param with no help record (hidden)."""
    param = MagicMock()
    param.get_help_record.return_value = None

    rows = VerticalChoicesCommand._param_rows(param, ctx=None)  # pylint: disable=protected-access
    assert not rows


def test_find_toml_prefers_output_dir(tmp_path):
    """_find_toml returns the output_dir copy when present."""
    toml = tmp_path / "dtaas.toml"
    toml.write_text("x = 1")

    assert _find_toml(str(tmp_path)) == toml


def test_find_toml_returns_none_when_absent(tmp_path, monkeypatch):
    """_find_toml returns None when no dtaas.toml exists in either location."""
    empty = tmp_path / "empty"
    empty.mkdir()
    monkeypatch.chdir(empty)  # cwd has no dtaas.toml either

    assert _find_toml(str(empty)) is None


def test_certs_src_handles_missing_section():
    """_certs_src returns '' when common.security is absent or malformed."""
    assert _certs_src({}) == ""
    assert _certs_src({"common": {"security": "oops"}}) == ""
    assert _certs_src({"common": {"security": {"certs-src": " /x "}}}) == "/x"


def test_provision_user_files_creates_dirs_and_sets_permissions(tmp_path):
    """provision_user_files recreates per-user dirs from toml and fixes ownership."""
    (tmp_path / "dtaas.toml").write_text('[users]\nstarting = ["alice"]\n')
    with patch("src.cmd_utils.projectPkg.create_user_dirs") as mock_create, patch(
        "src.cmd_utils.projectPkg.set_files_permissions"
    ) as mock_perms:
        provision_user_files(str(tmp_path))

    mock_create.assert_called_once_with(str(tmp_path), ["alice"])
    mock_perms.assert_called_once_with(str(tmp_path))


def test_provision_user_files_noop_without_toml(tmp_path, monkeypatch):
    """provision_user_files does nothing when no dtaas.toml is present."""
    monkeypatch.chdir(tmp_path)  # no dtaas.toml in output dir or cwd
    with patch("src.cmd_utils.projectPkg.create_user_dirs") as mock_create, patch(
        "src.cmd_utils.projectPkg.set_files_permissions"
    ) as mock_perms:
        provision_user_files(str(tmp_path))

    mock_create.assert_not_called()
    mock_perms.assert_not_called()


def test_stage_users_rejects_username_and_file(tmp_path):
    """Passing both a USERNAME and --file is rejected."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@intocps.org\n")
    csv_path = str(csv)
    with pytest.raises(click.ClickException, match="either a USERNAME or --file"):
        stage_users_for_add("alice", csv_path, None, (), True)


def test_stage_single_user_requires_email():
    """A single-user add without --email is rejected."""
    with pytest.raises(click.ClickException, match="--email"):
        stage_users_for_add("alice", None, None, (), True)


def test_stage_single_user_registers(tmp_path, monkeypatch):
    """A valid single-user add writes the user into the registry."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add("alice", None, "a@intocps.org", ("team",), False)

    store = load_registry()
    assert store["alice"]["email"] == "a@intocps.org"
    assert store["alice"]["groups"] == ["team"]
    assert store["alice"]["load_balance"] is False


def test_stage_single_user_defaults_group_to_additional(tmp_path, monkeypatch):
    """With no --group, a single-user add defaults the group to 'additional',
    matching the CSV import path."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add("alice", None, "a@intocps.org", (), True)

    assert load_registry()["alice"]["groups"] == ["additional"]


def test_stage_skips_duplicate_registry_user(tmp_path, monkeypatch, capsys):
    """A username already in the registry is skipped with a warning, not overwritten."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add("alice", None, "a@intocps.org", (), True)
    stage_users_for_add("alice", None, "changed@intocps.org", (), True)

    assert "'alice' already exists, skipping" in capsys.readouterr().out
    assert load_registry()["alice"]["email"] == "a@intocps.org"


def test_stage_skips_starting_user(tmp_path, monkeypatch, capsys):
    """A username that is a starting user in dtaas.toml is skipped."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text(
        '[users]\nstarting=["alice"]\n[users.alice]\nemail="a@intocps.org"\n'
    )
    stage_users_for_add("alice", None, "other@intocps.org", (), True)

    assert "'alice' already exists, skipping" in capsys.readouterr().out
    assert load_registry() == {}


def test_stage_rejects_invalid_username(tmp_path, monkeypatch):
    """A shell-unsafe username is rejected before registration."""
    monkeypatch.chdir(tmp_path)
    with pytest.raises(click.ClickException, match="Invalid username"):
        stage_users_for_add("bad;rm", None, "a@intocps.org", (), True)


def test_stage_noop_without_username_or_file(tmp_path, monkeypatch):
    """A bare add (no USERNAME, no --file) registers nothing."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(None, None, None, (), True)

    assert load_registry() == {}


def test_run_reconcile_reports_drift(tmp_path, capsys):
    """run_reconcile flags a user whose compose config differs from the state cache."""
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": "sha256:old"}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v2\n", encoding="utf-8"
    )

    run_reconcile(str(tmp_path))

    out = capsys.readouterr().out
    assert "alice" in out and "config changed" in out


def test_run_reconcile_in_sync(tmp_path, capsys):
    """run_reconcile reports 'In sync' when hashes match."""
    stored = config_hash({"image": "v1"})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": stored}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    run_reconcile(str(tmp_path))

    assert "In sync" in capsys.readouterr().out
