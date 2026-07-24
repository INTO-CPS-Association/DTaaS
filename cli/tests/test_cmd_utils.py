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

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift", return_value=([], [])
    ):
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

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift", return_value=([], [])
    ):
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

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift", return_value=([], [])
    ):
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

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift", return_value=([], [])
    ), patch("src.cmd_utils.userPkg.add_users") as mock_add:
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


def test_run_reconcile_reports_provisioned_user_without_container(tmp_path, capsys):
    """A registry user in the compose file but with no live container -- e.g. an
    interrupted 'user add' -- is reported as 'absent' (provisioned, container
    gone), distinct from 'missing' (no compose service at all)."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    stored = config_hash({"image": "v1"})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps({"alice": {"config_hash": stored}}), encoding="utf-8"
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift",
        return_value=([], ["alice"]),
    ):
        run_reconcile(str(tmp_path))

    out = capsys.readouterr().out
    assert "alice" in out and "its container is gone" in out
    assert "not provisioned" not in out


def test_run_reconcile_fix_reprovisions_only_absent_user(tmp_path):
    """--fix reprovisions a user whose compose entry exists but has no live
    container, restarting only that user (not the whole registry), so an
    interrupted 'user add' is repairable via reconcile without disrupting
    already-running users."""
    _write_registry(
        tmp_path, {"alice": {"email": "a@x.io"}, "bob": {"email": "b@x.io"}}
    )
    stored = config_hash({"image": "v1"})
    (tmp_path / ".dtaas.state.json").write_text(
        json.dumps(
            {
                "alice": {"config_hash": stored},
                "bob": {"config_hash": config_hash({"image": "v2"})},
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n  bob:\n    image: v2\n",
        encoding="utf-8",
    )

    mock_config = MagicMock()
    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift",
        return_value=([], ["alice"]),
    ), patch(
        "src.cmd_utils.configPkg.Config", return_value=mock_config
    ), patch(
        "src.cmd_utils.userPkg.add_users", return_value=None
    ) as mock_add:
        run_reconcile(str(tmp_path), fix=True)

    mock_add.assert_called_once_with(mock_config, start_only=["alice"])


def test_run_reconcile_fix_reprovisions_everyone_when_also_missing(tmp_path):
    """When a genuine membership mismatch ('bob' has no compose service at
    all) coexists with an absent user ('alice's container is gone), --fix
    falls back to the full reprovision (start_only=None) -- the compose file
    itself needs rewriting for bob, so narrowing to just the absent user would
    leave bob unprovisioned."""
    _write_registry(
        tmp_path, {"alice": {"email": "a@x.io"}, "bob": {"email": "b@x.io"}}
    )
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    mock_config = MagicMock()
    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift",
        return_value=([], ["alice"]),
    ), patch(
        "src.cmd_utils.configPkg.Config", return_value=mock_config
    ), patch(
        "src.cmd_utils.userPkg.add_users", return_value=None
    ) as mock_add:
        run_reconcile(str(tmp_path), fix=True)

    mock_add.assert_called_once_with(mock_config, start_only=None)


def test_run_reconcile_scopes_reconcile_drift_to_output_dir(tmp_path):
    """run_reconcile passes --output-dir through to reconcile_drift, so a
    read-only reconcile on deployment B never reads or reports on whatever
    deployment happens to be the current directory. It is called exactly
    once, not once per drift category, so the membership and desired-status
    checks share a single live-state snapshot instead of racing each other."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift", return_value=([], [])
    ) as mock_drift:
        run_reconcile(str(tmp_path))

    mock_drift.assert_called_once_with(str(tmp_path))


def test_run_reconcile_reports_desired_status_drift(tmp_path, capsys):
    """reconcile reports a provisioned user whose live state differs from desired."""
    _write_registry(tmp_path, {"alice": {"email": "a@x.io"}})
    (tmp_path / "compose.users.yml").write_text(
        "services:\n  alice:\n    image: v1\n", encoding="utf-8"
    )

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift",
        return_value=([("alice", "paused", "running")], []),
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

    with patch(
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift", return_value=([], [])
    ):
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
        "src.cmd_utils.usersLifecyclePkg.reconcile_drift",
        return_value=([("alice", "paused", "running")], []),
    ), patch(
        "src.cmd_utils.usersLifecyclePkg.enforce_desired_status"
    ) as mock_enforce, patch("src.cmd_utils.userPkg.add_users") as mock_add:
        run_reconcile(str(tmp_path), fix=True)

    mock_enforce.assert_called_once()
    mock_add.assert_not_called()  # membership in sync, so no reprovision
    assert "Enforced desired status" in capsys.readouterr().out
