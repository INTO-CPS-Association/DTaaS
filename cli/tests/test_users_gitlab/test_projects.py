"""Tests for the project step of users_gitlab.py: when the common and user
projects are created, skipped or failed, and what is persisted around them.
The project calls themselves are mocked here; their own behaviour is covered
by test_pkg_gitlab/test_projects.py."""

from src.pkg import users
from src.pkg.gitlab.provisioner import ProvisionResult
from tests.test_users_gitlab.conftest import TEMPLATES
# pylint: disable=redefined-outer-name,unused-argument


def _run_add(mock_config, mock_registry, details, start_only=("alice",)):
    """Run add_users for the single registry user 'alice' with *details*."""
    mock_registry["load"].return_value = {"alice": details}
    return users.add_users(
        mock_config, start_only=list(start_only), passwords={"alice": "S3cur3-p4ss"}
    )



def test_add_users_creates_projects_from_the_configured_template(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects
):
    """A newly provisioned user gets both projects, from the configured
    template, under the account id this run created, and is recorded as done."""
    err = _run_add(mock_config, mock_registry, {"email": "a@x.io"})

    assert err is None
    target, templates = mock_gitlab_projects.call_args.args[1:]
    assert (target.username, target.user_id) == ("alice", 42)
    assert templates == TEMPLATES
    gitlab_env["projects_created"].assert_called_once_with(["alice"])


def test_add_users_skips_projects_already_created(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects
):
    """A user marked gitlab_projects_created keeps the repositories they have."""
    details = {"email": "a@x.io", "gitlab_projects_created": True}
    err = _run_add(mock_config, mock_registry, details)

    assert err is None
    mock_gitlab_projects.assert_not_called()


def test_add_users_creates_projects_although_the_pat_was_issued(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects
):
    """A PAT issued on an earlier run must not skip a user whose projects are
    still missing: the account step is skipped, the project step is not."""
    details = {"email": "a@x.io", "gitlab_user_id": 42, "gitlab_pat_issued": True}
    err = _run_add(mock_config, mock_registry, details, start_only=[])

    assert err is None
    gitlab_env["ensure"].assert_not_called()
    assert mock_gitlab_projects.call_args.args[1].user_id == 42


def test_add_users_skips_projects_for_an_account_it_did_not_create(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects, capsys
):
    """An account that already existed belongs to whoever registered it, so
    no repositories are written into its namespace, for the same reason no
    token is issued for it. It is a warning, not a command failure."""
    gitlab_env["ensure"].return_value = ProvisionResult(
        "alice", True, "account already exists", already_exists=True
    )
    err = _run_add(mock_config, mock_registry, {"email": "a@x.io"})

    assert err is None
    mock_gitlab_projects.assert_not_called()
    gitlab_env["projects_created"].assert_not_called()
    assert "Warning" in capsys.readouterr().out


def test_add_users_project_failure_fails_the_command(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects
):
    """Projects that could not be created fail the command and are not
    recorded, while the token this run really did issue still is: the next
    run must retry the projects alone, not mint a second token."""
    mock_gitlab_projects.return_value = False
    err = _run_add(mock_config, mock_registry, {"email": "a@x.io"})

    assert err is not None
    assert "alice" in str(err)
    gitlab_env["projects_created"].assert_not_called()
    gitlab_env["pat_issued"].assert_called_once_with(["alice"])


def test_add_users_skips_projects_when_the_account_failed(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects
):
    """No account means no namespace to create projects in."""
    gitlab_env["ensure"].return_value = ProvisionResult(
        "alice", False, "GitLab unreachable"
    )
    err = _run_add(mock_config, mock_registry, {"email": "a@x.io"})

    assert err is not None
    mock_gitlab_projects.assert_not_called()


def test_add_users_without_a_template_still_provisions_accounts(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects, capsys
):
    """A dtaas.toml that configures no project template is not a failure: the
    account and its token are provisioned and only the projects are skipped."""
    mock_config.get_gitlab_templates.return_value = (None, None)
    err = _run_add(mock_config, mock_registry, {"email": "a@x.io"})

    assert err is None
    gitlab_env["ensure"].assert_called_once()
    mock_gitlab_projects.assert_not_called()
    assert "no project templates in dtaas.toml" in capsys.readouterr().out


def test_add_users_with_a_half_configured_template_fails_the_user(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects, capsys
):
    """Only some of the template keys set is a typo rather than an opt out, so
    it fails the command instead of quietly leaving the user without
    repositories. The account and its token are still provisioned and kept."""
    mock_config.get_gitlab_templates.return_value = (
        None,
        Exception("Config file error: gitlab project template is incomplete"),
    )
    err = _run_add(mock_config, mock_registry, {"email": "a@x.io"})

    assert err is not None
    assert "alice" in str(err)
    gitlab_env["ensure"].assert_called_once()
    gitlab_env["pat_issued"].assert_called_once_with(["alice"])
    gitlab_env["projects_created"].assert_not_called()
    mock_gitlab_projects.assert_not_called()
    assert "template is incomplete" in capsys.readouterr().out


def test_add_users_retries_projects_without_a_password(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects, capsys
):
    """The documented retry path, a token issued earlier and projects still
    missing, needs no password: the account half is the only half that uses
    one, and it is the half being skipped. Called as the CLI calls it for an
    already-registered user: nothing started, the user named with None."""
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io", "gitlab_user_id": 42, "gitlab_pat_issued": True}
    }
    err = users.add_users(mock_config, start_only=[], passwords={"alice": None})

    assert err is None
    gitlab_env["ensure"].assert_not_called()
    assert mock_gitlab_projects.call_args.args[1].user_id == 42
    out = capsys.readouterr().out
    assert "already issued" in out
    assert "No GitLab password supplied" not in out


def test_add_users_persists_the_token_before_waiting_on_the_import(
    mock_config, mock_registry, gitlab_env, mock_gitlab_projects
):
    """The project step blocks on a server side import for as long as it
    takes, so a token still held in memory at that point is one an interrupted
    run loses while it stays live on GitLab. It goes to disk first."""
    seen = {}

    def _projects(*_args):
        seen["pat_issued"] = gitlab_env["pat_issued"].call_args
        return True

    mock_gitlab_projects.side_effect = _projects
    err = _run_add(mock_config, mock_registry, {"email": "a@x.io"})

    assert err is None
    assert seen["pat_issued"].args == (["alice"],)
