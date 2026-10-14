"""Tests for the account and Personal Access Token step of users_gitlab.py,
and for which users a GitLab failure fails."""

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
    assert "No GitLab password supplied" in capsys.readouterr().out


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


def test_add_users_gitlab_already_exists_fails_the_command(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """An account that already existed before this run gets no token, so the
    user is left without one: the command fails, naming them, and nothing is
    written for them."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}
    gl = MagicMock()

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        return_value=ProvisionResult("alice", False, "account already exists"),
    ), patch("src.pkg.users_gitlab_records.utils.write_secret_file") as mock_write:
        err = users.add_users(
            mock_config, start_only=["alice"], passwords={"alice": "pw"}
        )

    assert "alice" in str(err)
    mock_write.assert_not_called()
    assert "GitLab provisioning failed for 'alice'" in capsys.readouterr().out


@pytest.mark.usefixtures("mock_utils", "mock_user_operations")
def test_client_failure_does_not_fail_a_finished_user(
    mock_config, mock_registry, capsys
):
    """A user whose token was issued long ago has nothing left to do, so an
    unusable client must not fail them for it."""
    mock_config.get_gitlab_provision.return_value = (True, None)
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
@pytest.mark.parametrize(
    "details,passwords,fails",
    [
        ({}, {"alice": "pw"}, True),
        ({}, {}, False),
        ({"gitlab_pat_issued": True}, {"alice": "pw"}, False),
    ],
)
def test_client_error_fails_only_users_with_an_account_to_create(
    mock_config, mock_registry, capsys, details, passwords, fails
):
    """An unusable client fails only the users this run would have created an
    account for: one with a password and no token yet. A user with no
    password, or whose token was already issued, had nothing to do."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io", **details}}
    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client",
        return_value=(None, Exception("no PAT configured")),
    ):
        err = users.add_users(mock_config, start_only=["alice"], passwords=passwords)
    assert (err is not None) is fails
    assert "GitLab provisioning skipped" in capsys.readouterr().out


def test_one_users_unexpected_failure_does_not_end_the_run(
    mock_config, mock_registry, mock_utils, mock_user_operations, capsys
):
    """A failure the API layer did not expect (here a response shaped unlike
    GitLab's) is that user's alone. It used to abort the loop, so a bulk add reported
    one error and silently never attempted the users after it."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io"},
        "bob": {"email": "b@x.io"},
    }
    accounts = [
        AttributeError("response has no 'id'"),
        ProvisionResult("bob", True, "created", "glpat-bob", user_id=2),
    ]

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(MagicMock(), None)
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources", side_effect=accounts
    ) as mock_ensure, patch(
        "src.pkg.users_gitlab_records.utils.write_secret_file"
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
    assert err is not None
    assert "alice" in str(err)
    assert "bob" not in str(err)
    assert "response has no 'id'" in capsys.readouterr().out
