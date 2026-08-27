"""Tests for the optional GitLab account/PAT provisioning in users_gitlab.py.

Driven through users.add_users (the public entry point), so the fixtures
mirror test_users.py's.
"""

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


def test_gitlab_target_usernames_scoped_to_start_only_and_registry():
    """Only names in both start_only and the registry are targeted -- a
    typo'd or unregistered name is dropped."""
    ctx = MagicMock(user_list=["alice", "bob"])
    assert users_gitlab._gitlab_target_usernames(ctx, ["alice", "trudy"], {}) == [
        "alice"
    ]


def test_gitlab_target_usernames_includes_password_retry_for_existing_user():
    """An already-registered user outside start_only who supplied a password
    again this run is still targeted -- the explicit retry path for a user
    whose GitLab PAT issuance failed on a prior run."""
    ctx = MagicMock(user_list=["alice", "bob"])
    result = users_gitlab._gitlab_target_usernames(ctx, ["alice"], {"bob": "pw"})
    assert result == ["alice", "bob"]


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


def test_add_users_skips_gitlab_when_no_passwords_supplied(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """No GitLab client is built when no passwords are supplied (e.g. from
    'config reconcile --fix'), even if provisioning is enabled."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}

    with patch("src.pkg.users_gitlab.gitlabPkg.resolve_client") as mock_resolve:
        err = users.add_users(mock_config, start_only=["alice"], passwords=None)

    assert err is None
    mock_resolve.assert_not_called()


def test_add_users_provisions_gitlab_and_saves_token(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """An enabled, successful GitLab provision saves the issued PAT."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "alice@x.io"}}
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ) as mock_resolve, patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult("alice", True, "created", "glpat-token"),
    ) as mock_ensure, patch(
        "src.pkg.users_gitlab.utils.write_secret_file"
    ) as mock_write:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "S3cur3-p4ss"}
        )

    assert err is None
    mock_resolve.assert_called_once_with(mock_config)
    mock_ensure.assert_called_once_with(
        gl,
        gitlabPkg.GitlabUser(
            "alice", "alice@x.io", "S3cur3-p4ss", existing_user_id=None
        ),
    )
    mock_write.assert_called_once()
    saved_content = mock_write.call_args.args[1]
    assert "glpat-token" in saved_content


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
        "src.pkg.users_gitlab.set_gitlab_user_ids"
    ) as mock_set_ids:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "S3cur3-p4ss"}
        )

    assert err is None
    mock_set_ids.assert_called_once_with({"alice": 42})


def test_add_users_provisions_gitlab_retries_pat_with_stored_user_id(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """A registry entry with a stored gitlab_user_id (from a prior successful
    creation) is passed to ensure_user_resources as existing_user_id, so a
    retry after a PAT-issuance failure reissues a token directly."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "alice@x.io", "gitlab_user_id": 42}
    }
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult(
            "alice", True, "GitLab token issued (retry).", "glpat-token", user_id=42
        ),
    ) as mock_ensure, patch("src.pkg.users_gitlab.utils.write_secret_file"), patch(
        "src.pkg.users_gitlab.set_gitlab_user_ids"
    ) as mock_set_ids:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "S3cur3-p4ss"}
        )

    assert err is None
    mock_ensure.assert_called_once_with(
        gl,
        gitlabPkg.GitlabUser("alice", "alice@x.io", "S3cur3-p4ss", existing_user_id=42),
    )
    mock_set_ids.assert_not_called()  # user_id unchanged: nothing new to persist


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
    ) as mock_ensure, patch("src.pkg.users_gitlab.utils.write_secret_file"):
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
