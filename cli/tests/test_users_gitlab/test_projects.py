"""Tests for the project step that follows the account step in
users_gitlab.py, driven through users.add_users."""

from contextlib import contextmanager
from unittest.mock import MagicMock, patch
import pytest
from src.pkg import users
from src.gitlab_common import ProjectOutcome, ProjectResult
from src.pkg.gitlab.provisioner import ProvisionResult
# pylint: disable=redefined-outer-name,unused-argument

TEMPLATES = {
    "common": "https://gitlab.com/dtaas/common.git",
    "user": "https://gitlab.com/dtaas/user1.git",
}
ALICE = ProvisionResult("alice", True, "created", "glpat-alice", user_id=42)
EARLIER = {"email": "b@x.io", "gitlab_user_id": 7, "gitlab_pat_issued": True}


@pytest.fixture
def gitlab_on(mock_config, mock_registry, mock_utils, mock_user_operations):
    """Provisioning on with both templates set, alice in the registry."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_config.get_gitlab_templates.return_value = (TEMPLATES, None)
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}
    return mock_config


@pytest.fixture
def ensure():
    """git usable, and every project created."""
    with patch(
        "src.pkg.users_gitlab_projects.gitlabPkg.git_problem", return_value=""
    ), patch(
        "src.gitlab_common.project_run.ensure_project",
        return_value=ProjectResult(ProjectOutcome.CREATED),
    ) as mock_ensure:
        yield mock_ensure


@contextmanager
def _accounts(*results, client_err=None, save_err=None):
    """Patch the account step: the client, each account's result, and the
    token and registry writes (failing with *save_err* when given)."""
    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client",
        return_value=(None if client_err else MagicMock(), client_err),
    ) as resolve, patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources",
        side_effect=list(results),
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.revoke_issued_tokens", return_value=(True, "")
    ), patch(
        "src.pkg.users_gitlab_records.utils.write_secret_file", side_effect=save_err
    ), patch("src.pkg.users_gitlab_records.set_gitlab_pat_issued"), patch(
        "src.pkg.users_gitlab_records.set_gitlab_user_ids"
    ):
        yield resolve


def _add(config, names):
    """'user add' naming *names*, each with a password."""
    return users.add_users(
        config, start_only=names, passwords=dict.fromkeys(names, "pw")
    )


def test_a_new_account_is_followed_by_its_projects(gitlab_on, ensure):
    """Once the account and token exist, both projects are made with the
    new account's id."""
    with _accounts(ALICE):
        err = _add(gitlab_on, ["alice"])
    assert err is None
    assert [call.args[1].name for call in ensure.call_args_list] == ["common", "user"]
    assert {call.args[1].user_id for call in ensure.call_args_list} == {42}


def test_a_failed_account_gets_no_projects(gitlab_on, ensure):
    """No account, no projects: the user fails for the account alone."""
    with _accounts(ProvisionResult("alice", False, "GitLab unreachable")):
        err = _add(gitlab_on, ["alice"])
    assert "GitLab provisioning failed for: alice" in str(err)
    ensure.assert_not_called()


def test_a_project_failure_fails_the_command(gitlab_on, ensure, capsys):
    """A project failure names the user in the command's failure, after the
    containers and the account were made, and undoes neither."""
    ensure.return_value = ProjectResult(ProjectOutcome.FAILED, "quota reached")
    with _accounts(ALICE):
        err = _add(gitlab_on, ["alice"])
    assert "GitLab provisioning failed for: alice" in str(err)
    assert "Their containers were still provisioned." in str(err)
    assert "GitLab account and token created for 'alice'." in capsys.readouterr().out


def test_a_bad_template_setting_stops_before_any_account(gitlab_on, ensure):
    """'user add' does not run 'config validate': one template alone is
    refused before the client is even built."""
    gitlab_on.get_gitlab_templates.return_value = ({}, Exception("must both be set"))
    with _accounts(ALICE) as resolve:
        err = _add(gitlab_on, ["alice"])
    assert "must both be set" in str(err)
    resolve.assert_not_called()
    ensure.assert_not_called()


@pytest.mark.parametrize(
    "projects,fails",
    [([], True), (["common"], True), (["common", "user"], False)],
    ids=["none-made", "one-made", "all-made"],
)
def test_client_error_fails_a_user_waiting_for_a_project(
    gitlab_on, mock_registry, projects, fails
):
    """An earlier account still lacking a project had work this run, so an
    unusable client fails them; one with every project had none."""
    mock_registry["load"].return_value = {
        "bob": {**EARLIER, "gitlab_projects": projects}
    }
    with _accounts(client_err=Exception("no PAT configured")):
        err = users.add_users(gitlab_on, start_only=[], passwords={"bob": None})
    assert (err is not None and "bob" in str(err)) is fails


def test_a_lost_token_stops_the_projects_of_later_users(
    gitlab_on, mock_registry, ensure, capsys
):
    """Once a token cannot be saved the run ends its GitLab work, and a later
    user waiting only for projects is named among those it stopped for."""
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}, "bob": EARLIER}
    with _accounts(ALICE, save_err=OSError("disk full")):
        err = users.add_users(
            gitlab_on, start_only=["alice"], passwords={"alice": "pw", "bob": None}
        )
    assert "GitLab provisioning stopped for: bob" in capsys.readouterr().out
    assert "alice, bob" in str(err)
    ensure.assert_not_called()
