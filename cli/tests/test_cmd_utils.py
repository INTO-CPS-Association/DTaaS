"""Tests for the CLI helper functions in cmd_utils.py (uninstall/reconcile/update)."""

import json
from unittest.mock import MagicMock, patch
from src.cmd_utils import run_reconcile
from src.pkg.state import config_hash


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


def test_run_reconcile_reports_desired_status_drift(tmp_path, capsys):
    """reconcile reports a provisioned user whose live state differs from desired."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    with patch(
        "src.cmd_utils.usersLifecyclePkg.desired_status_drift",
        return_value=[("alice", "paused", "running")],
    ):
        run_reconcile(str(tmp_path))

    out = capsys.readouterr().out
    assert "alice: desired 'paused' but container is 'running'" in out


def test_run_reconcile_in_sync_needs_no_status_drift(tmp_path, capsys):
    """'In sync' prints only when membership AND desired-status both agree."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    stored = config_hash({"image": "v1"})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": stored}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    with patch("src.cmd_utils.usersLifecyclePkg.desired_status_drift", return_value=[]):
        run_reconcile(str(tmp_path))

    assert "In sync" in capsys.readouterr().out


def test_run_reconcile_fix_enforces_desired_status(tmp_path, capsys):
    """--fix enforces desired_status when there is state drift, even if
    membership is otherwise in sync."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    stored = config_hash({"image": "v1"})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": stored}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    with patch(
        "src.cmd_utils.usersLifecyclePkg.desired_status_drift",
        return_value=[("alice", "paused", "running")],
    ), patch(
        "src.cmd_utils.usersLifecyclePkg.enforce_desired_status"
    ) as mock_enforce, patch("src.cmd_utils.userPkg.add_users") as mock_add:
        run_reconcile(str(tmp_path), fix=True)

    mock_enforce.assert_called_once()
    mock_add.assert_not_called()  # membership in sync, so no reprovision
    assert "Enforced desired status" in capsys.readouterr().out
