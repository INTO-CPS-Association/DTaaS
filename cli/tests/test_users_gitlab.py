"""Tests for the optional GitLab account/PAT provisioning in users_gitlab.py.

Driven through users.add_users (the public entry point), so the fixtures
mirror test_users.py's.
"""

import json
from unittest.mock import patch, MagicMock
import pytest
from src.pkg import users
from src.pkg import users_gitlab
from src.pkg import gitlab as gitlabPkg
from src.pkg.gitlab.provisioner import ProvisionResult
# pylint: disable=redefined-outer-name,unused-argument,protected-access


@pytest.fixture
def mock_config():
    """Mock config object providing deployment settings from dtaas.toml."""
    mock = MagicMock()
    mock.get_server_dns.return_value = ("foo.example.com", None)
    mock.get_path.return_value = ("/test/path", None)
    mock.get_resource_limits.return_value = (
        {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"},
        None,
    )
    mock.get_tls.return_value = (False, None)
    mock.get_set_limits.return_value = (True, None)
    mock.get_gitlab_provision.return_value = (False, None)
    return mock


@pytest.fixture
def mock_registry():
    """Patch the registry store functions add_users uses."""
    with patch("src.pkg.users.load_registry") as mock_load, patch(
        "src.pkg.users.remove_from_registry"
    ) as mock_remove:
        mock_load.return_value = {"user1": {"email": "user1@x.io"}}
        yield {"load": mock_load, "remove": mock_remove}


@pytest.fixture
def mock_utils():
    """Mock the utils functions add_users calls directly."""
    with patch("src.pkg.users.utils.import_yaml") as mi, patch(
        "src.pkg.users.utils.export_yaml"
    ) as me:
        mi.return_value = ({"version": "3", "services": {}}, None)
        me.return_value = None
        yield {"import": mi, "export": me}


@pytest.fixture
def mock_user_operations():
    """Mock the users_compose functions imported into users.py"""
    with patch("src.pkg.users.create_user_files") as mc, patch(
        "src.pkg.users.add_users_to_compose"
    ) as ma, patch("src.pkg.users.finalize_compose") as mf, patch(
        "src.pkg.users.stop_user_containers"
    ) as mst, patch("src.pkg.users.write_state") as mw:
        mc.return_value = ma.return_value = mf.return_value = None
        mst.return_value = None
        mw.return_value = {}
        yield {"create": mc, "add": ma, "finalize": mf, "stop": mst, "state": mw}


def test_gitlab_target_usernames_start_only_none_means_all_registry_users():
    """start_only=None (config reconcile --fix) targets every registry user."""
    ctx = MagicMock(user_list=["alice", "bob"])
    assert users_gitlab._gitlab_target_usernames(ctx, None, {}) == ["alice", "bob"]


def test_add_users_skips_gitlab_when_provision_disabled(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """No GitLab client is built when [gitlab].provision is False, even with
    passwords supplied."""
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}

    with patch("src.pkg.users_gitlab.gitlabPkg.resolve_client") as mock_resolve:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "pw"}
        )

    assert err is None
    mock_resolve.assert_not_called()


def test_add_users_provisions_gitlab_persists_new_user_id(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """A freshly created account's user_id is persisted to the registry, so
    a later retry can reissue a PAT without going through create_user again."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "alice@x.io"}}
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult(
            "alice", True, "created", "glpat-token", user_id=42
        ),
    ), patch("src.pkg.users_gitlab.utils.write_secret_file"), patch(
        "src.pkg.users_gitlab.set_gitlab_pat_issued"
    ), patch(
        "src.pkg.users_gitlab.set_gitlab_user_ids"
    ) as mock_set_ids:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "S3cur3-p4ss"}
        )

    assert err is None
    mock_set_ids.assert_called_once_with({"alice": 42})


def test_add_users_gitlab_skips_user_with_no_password(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """A targeted user missing from the passwords map is skipped with a
    warning, not silently ignored or fatal."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io"},
        "bob": {"email": "b@x.io"},
    }
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult("alice", True, "created", "glpat-token"),
    ) as mock_ensure, patch("src.pkg.users_gitlab.utils.write_secret_file"), patch(
        "src.pkg.users_gitlab.set_gitlab_pat_issued"
    ):
        err = users.add_users(
            mock_config,
            start_only=["alice", "bob"],
            passwords={"alice": "S3cur3-p4ss"},
        )

    assert err is None
    mock_ensure.assert_called_once()
    assert "no password supplied" in capsys.readouterr().out


def test_add_users_gitlab_client_failure_fails_the_command(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """A GitLab client/PAT resolution failure is reported and surfaces as a
    command failure (non-zero exit), even though container provisioning
    already succeeded by this point and is left in place."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client",
        return_value=(None, Exception("no PAT configured")),
    ):
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "pw"}
        )

    assert err is not None
    assert "alice" in str(err)
    assert "GitLab provisioning skipped" in capsys.readouterr().out


def test_add_users_gitlab_provisioning_failure_fails_the_command(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """A per-user GitLab provisioning failure is reported, surfaces as a
    command failure, and no token is saved for that user."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult("alice", False, "GitLab unreachable"),
    ), patch("src.pkg.users_gitlab.utils.write_secret_file") as mock_write:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "pw"}
        )

    assert err is not None
    assert "alice" in str(err)
    mock_write.assert_not_called()
    assert "GitLab provisioning failed for 'alice'" in capsys.readouterr().out


def test_add_users_gitlab_skips_user_whose_pat_was_already_issued(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """A re-run for an already-registered user whose registry entry is marked
    gitlab_pat_issued issues no new token: ensure_user_resources is never
    called, nothing is written, and it is not a command failure (H1)."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io", "gitlab_user_id": 42, "gitlab_pat_issued": True}
    }
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources"
    ) as mock_ensure, patch(
        "src.pkg.users_gitlab.utils.write_secret_file"
    ) as mock_write, patch(
        "src.pkg.users_gitlab.set_gitlab_pat_issued"
    ) as mock_set_issued:
        err = users.add_users(
            mock_config, start_only=[], passwords={"alice": "S3cur3-p4ss"}
        )

    assert err is None
    mock_ensure.assert_not_called()
    mock_write.assert_not_called()
    mock_set_issued.assert_not_called()
    assert "already issued" in capsys.readouterr().out


def test_save_gitlab_tokens_keeps_superseded_entry_rather_than_overwriting(
    tmp_path, monkeypatch, capsys
):
    """If the tokens file already holds a different token for a user, the old
    value is retained under a timestamped key (and a warning printed) instead
    of being silently dropped."""
    monkeypatch.chdir(tmp_path)
    tokens_file = tmp_path / "gitlab_user_tokens.json"
    tokens_file.write_text('{"alice": "glpat-old"}', encoding="utf-8")

    users_gitlab._save_gitlab_tokens({"alice": "glpat-new"})

    saved = json.loads(tokens_file.read_text(encoding="utf-8"))
    assert saved["alice"] == "glpat-new"
    superseded = [k for k in saved if k.startswith("alice (superseded ")]
    assert len(superseded) == 1
    assert saved[superseded[0]] == "glpat-old"
    assert "revoked manually" in capsys.readouterr().out


def test_add_users_gitlab_already_exists_warns_but_is_not_a_command_failure(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """An account that already existed before this run is echoed as an
    unconditional warning -- not silently treated as an unremarkable success
    -- but does not fail the command, since this run changed nothing."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult(
            "alice", True, "account already exists", already_exists=True
        ),
    ), patch("src.pkg.users_gitlab.utils.write_secret_file") as mock_write:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "pw"}
        )

    assert err is None
    mock_write.assert_not_called()
    out = capsys.readouterr().out
    assert "Warning" in out
    assert "alice" in out
