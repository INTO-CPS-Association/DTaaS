"""Tests for the account and Personal Access Token step of users_gitlab.py,
and for which users a GitLab failure fails. The project step is stubbed by
this folder's conftest; its own tests are in test_projects.py."""

from unittest.mock import patch, MagicMock
import pytest
from src.pkg import users
from src.pkg.gitlab.provisioner import ProvisionResult
# pylint: disable=redefined-outer-name,unused-argument


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
    ), patch("src.pkg.users_gitlab_records.utils.write_secret_file"), patch(
        "src.pkg.users_gitlab_records.set_gitlab_pat_issued"
    ), patch(
        "src.pkg.users_gitlab_records.set_gitlab_user_ids"
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
    ) as mock_ensure, patch("src.pkg.users_gitlab_records.utils.write_secret_file"), patch(
        "src.pkg.users_gitlab_records.set_gitlab_pat_issued"
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
    ), patch("src.pkg.users_gitlab_records.utils.write_secret_file") as mock_write:
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
        "src.pkg.users_gitlab_records.utils.write_secret_file"
    ) as mock_write, patch(
        "src.pkg.users_gitlab_records.set_gitlab_pat_issued"
    ) as mock_set_issued:
        err = users.add_users(
            mock_config, start_only=[], passwords={"alice": "S3cur3-p4ss"}
        )

    assert err is None
    mock_ensure.assert_not_called()
    mock_write.assert_not_called()
    mock_set_issued.assert_not_called()
    assert "already issued" in capsys.readouterr().out


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
    ), patch("src.pkg.users_gitlab_records.utils.write_secret_file") as mock_write:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "pw"}
        )

    assert err is None
    mock_write.assert_not_called()
    out = capsys.readouterr().out
    assert "Warning" in out
    assert "alice" in out


@pytest.mark.usefixtures("mock_utils", "mock_user_operations")
def test_add_users_stops_at_the_run_deadline(mock_config, mock_registry, capsys):
    """Each user's projects wait on a server side import, so a run that has
    spent its budget stops starting new ones. Those it did not reach are
    named and left for the next run, not reported as failures."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io"},
        "bob": {"email": "b@x.io"},
    }
    passwords = {"alice": "S3cur3-p4ss", "bob": "S3cur3-p4ss"}
    with patch("src.pkg.users_gitlab.RunDeadline") as deadline, patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(MagicMock(), None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult("alice", True, "created", "glpat-token", user_id=1),
    ) as ensure, patch(
        "src.pkg.users_gitlab_records.utils.write_secret_file"
    ), patch("src.pkg.users_gitlab_records.set_gitlab_pat_issued"), patch(
        "src.pkg.users_gitlab_records.set_gitlab_user_ids"
    ):
        deadline.return_value.passed.side_effect = [False, True]
        err = users.add_users(
            mock_config, start_only=["alice", "bob"], passwords=passwords
        )

    assert err is None
    assert ensure.call_count == 1
    out = capsys.readouterr().out
    assert "not attempted: bob" in out
    assert "Re-run" in out


@pytest.mark.usefixtures("mock_utils", "mock_user_operations")
def test_add_users_without_a_template_does_not_fail_a_finished_user(
    mock_config, mock_registry, capsys
):
    """A deployment that provisions accounts without repositories never sets
    gitlab_projects_created, so a user whose token was issued long ago has
    nothing left to do. An unusable client must not fail them for it."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_config.get_gitlab_templates.return_value = (None, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io", "gitlab_user_id": 42, "gitlab_pat_issued": True}
    }
    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client",
        return_value=(None, Exception("no PAT configured")),
    ):
        err = users.add_users(mock_config, start_only=[], passwords={"alice": None})
    assert err is None
    assert "skipped" in capsys.readouterr().out


@pytest.mark.usefixtures("mock_utils", "mock_user_operations")
@pytest.mark.parametrize("details,fails", [({}, False), ({"gitlab_user_id": 42}, True)])
def test_add_users_without_passwords_client_error_fails_only_pending_work(
    mock_config, mock_registry, capsys, details, fails
):
    """A plain 'user add' reaches the GitLab step so project-only retries work
    without credentials. An unusable client fails only users who had work
    waiting: an account with projects still to create is failed, even where
    tokens are issued out of band, while a user with no account is not."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io", **details}}
    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client",
        return_value=(None, Exception("no PAT configured")),
    ):
        err = users.add_users(mock_config, start_only=["alice"], passwords={})
    assert (err is not None) is fails
    assert "GitLab provisioning skipped" in capsys.readouterr().out


def test_one_users_unexpected_failure_does_not_end_the_run(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """A failure the API layer did not expect (here an unreadable token file)
    is that user's alone. It used to abort the loop, so a bulk add reported
    one error and silently never attempted the users after it."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io"},
        "bob": {"email": "b@x.io"},
    }
    accounts = [
        ProvisionResult("alice", True, "created", "glpat-alice", user_id=1),
        ProvisionResult("bob", True, "created", "glpat-bob", user_id=2),
    ]

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(MagicMock(), None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources", side_effect=accounts
    ) as mock_ensure, patch(
        "src.pkg.users_gitlab_records.utils.write_secret_file",
        side_effect=[OSError("token file is not writable"), None],
    ), patch(
        "src.pkg.users_gitlab_records.set_gitlab_user_ids"
    ), patch(
        "src.pkg.users_gitlab_records.set_gitlab_pat_issued"
    ):
        err = users.add_users(
            mock_config,
            start_only=["alice", "bob"],
            passwords={"alice": "pw", "bob": "pw"},
        )

    assert [call.args[1].username for call in mock_ensure.call_args_list] == [
        "alice",
        "bob",
    ]
    assert err is not None and "alice" in str(err) and "bob" not in str(err)
    assert "token file is not writable" in capsys.readouterr().out
