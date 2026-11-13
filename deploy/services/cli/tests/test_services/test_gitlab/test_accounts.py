"""Tests for the GitLab account step (accounts.py): an account and a token
per CSV row, the record of an account this CLI made, an account found after
a 409 (or GitLab's words when there is none), and the token issued again
for an account this CLI made when none is saved."""

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock

import pytest
from gitlab.exceptions import GitlabCreateError, GitlabError
from dtaas_services.gitlab_common import UserInfo, with_hint
from dtaas_services.pkg.services.gitlab import accounts, project_state, tokens_file
from dtaas_services.pkg.services.gitlab.accounts import AccountRun, create_account
from dtaas_services.pkg.services.gitlab.project_state import UserRecord
from dtaas_services.pkg.services.gitlab.user_projects import Account
# pylint: disable=W0621

MODULE = "dtaas_services.pkg.services.gitlab.accounts"
TOKEN = "fake-user-token"  # noqa: S105 # NOSONAR
PASSWORD = "UserP@ss123"  # noqa: S105 # NOSONAR
ROW = {"username": " alice ", "email": "alice@example.com", "password": PASSWORD}
CREATED_AT = "2026-11-10T09:14:31.123Z"
MADE_HERE = UserRecord(7, CREATED_AT, created=True)
PAT_FAILED = "Failed to create PAT for 'alice': 500"
CONFLICT = GitlabCreateError("Username has already been taken", 409)
FOUND = Account("alice", 7, created_at=CREATED_AT)


@pytest.fixture
def gitlab(mocker, tmp_path):
    """An admin client that creates alice as account 7, PATs issued, a
    lookup answering account 7, and the project base dir in tmp_path."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    (tmp_path / "config").mkdir()
    gl = MagicMock()
    gl.users.create.return_value = Mock(id=7, created_at=CREATED_AT)
    return SimpleNamespace(
        gl=gl,
        pat=mocker.patch(f"{MODULE}.create_user_pat", return_value=(True, TOKEN)),
        find=mocker.patch(
            f"{MODULE}.find_user", return_value=(UserInfo(7, CREATED_AT), "")
        ),
        revoke=mocker.patch(f"{MODULE}.revoke_user_pats", return_value=(True, "")),
        records=tmp_path / "config" / "gitlab_user_projects.json",
    )


def _run(gitlab, saved=None, records=None):
    """The account step's run over *gitlab*'s client."""
    return AccountRun(gitlab.gl, saved or {}, records or {})


def test_a_new_account_is_recorded_before_its_token_is_issued(gitlab):
    """The row's fields are trimmed, the account is recorded as made by this
    CLI the moment it exists (the record is on disk when the PAT is asked
    for), and it carries its id, token and creation time."""
    on_disk = []
    gitlab.pat.side_effect = lambda *args: on_disk.append(
        project_state.read_records()[0]
    ) or (True, TOKEN)

    result = create_account(_run(gitlab), ROW)

    assert result == (True, "", Account("alice", 7, TOKEN, CREATED_AT))
    assert gitlab.gl.users.create.call_args.args[0]["username"] == "alice"
    assert on_disk == [{"alice": MADE_HERE}]
    gitlab.pat.assert_called_once_with(gitlab.gl, 7, "alice", accounts.USER_PAT_OPTIONS)


def test_a_new_account_replaces_an_older_record_of_the_name(gitlab):
    """The record of an earlier account of the same name (a reinstall, or
    the user deleted and added again) is replaced by the new account's."""
    old = UserRecord(7, "2026-10-29T08:00:00.000Z", True, ("common", "user"))
    gitlab.records.write_text(json.dumps({"alice": old.to_json()}), encoding="utf-8")

    create_account(_run(gitlab), ROW)

    assert project_state.read_records()[0] == {"alice": MADE_HERE}


def test_a_failed_token_is_issued_again_by_the_next_run(gitlab):
    """The account stays recorded as made by this CLI, so the row fails
    with the promise that the next run issues the token, and no account is
    handed on without one."""
    gitlab.pat.return_value = (False, PAT_FAILED)

    assert create_account(_run(gitlab), ROW) == (
        False,
        f"{PAT_FAILED}. The next 'dtaas-services user add -s gitlab' issues one "
        "again.",
        None,
    )
    assert project_state.read_records()[0] == {"alice": MADE_HERE}


@pytest.mark.parametrize(
    "pat,handed_on",
    [
        ((True, TOKEN), Account("alice", 7, TOKEN, CREATED_AT)),
        ((False, PAT_FAILED), None),
    ],
    ids=["token-issued", "token-failed"],
)
def test_an_account_that_cannot_be_recorded_fails_the_row(gitlab, pat, handed_on):
    """A record that cannot be saved fails the row with why. A token issued
    anyway still reaches the token file, but no later run is promised to
    issue one, since nothing says this CLI made the account."""
    gitlab.records.write_text("{not json", encoding="utf-8")
    gitlab.pat.return_value = pat

    ok, error, account = create_account(_run(gitlab), ROW)

    assert ok is False
    assert account == handed_on
    assert error.startswith("config/gitlab_user_projects.json cannot be written: ")
    assert "issues one again" not in error


@pytest.mark.parametrize(
    "row,failure,said",
    [
        ({**ROW, "username": "bad user"}, None, "Invalid user input"),
        ({"username": None, "email": None, "password": None}, None, "Invalid user"),
        (ROW, GitlabError("connection refused"), "connection refused"),
    ],
    ids=["invalid-username", "none-values", "gitlab-error"],
)
def test_a_row_without_an_account_records_nothing(gitlab, row, failure, said):
    """Invalid or missing values fail the row before the API is called, and
    a failed create keeps GitLab's words: no account, no record."""
    gitlab.gl.users.create.side_effect = failure

    ok, error, account = create_account(_run(gitlab), row)

    assert ok is False
    assert account is None
    assert said in error
    assert gitlab.gl.users.create.called is (failure is not None)
    assert not gitlab.records.exists()


@pytest.mark.parametrize(
    "saved,records",
    [
        ({"alice": TOKEN}, {"alice": MADE_HERE}),
        ({}, {}),
        ({}, {"alice": UserRecord(7, CREATED_AT, created=False)}),
    ],
    ids=["token-saved", "no-record", "not-made-here"],
)
def test_an_existing_account_is_left_as_it_is(gitlab, saved, records):
    """No token is issued for an account this CLI did not create, nor for
    one whose token is saved: it is looked up once and handed on as it is,
    with its id and creation time."""
    gitlab.gl.users.create.side_effect = CONFLICT

    assert create_account(_run(gitlab, saved, records), ROW) == (True, "", FOUND)
    gitlab.find.assert_called_once_with(gitlab.gl, "alice")
    gitlab.revoke.assert_not_called()
    gitlab.pat.assert_not_called()


@pytest.mark.parametrize(
    "lookup",
    [
        "GitLab has no user named 'alice'.",
        "Failed to look up GitLab user 'alice': 500: GitLab error page (request ID 01M7)",
    ],
    ids=["no-account-of-the-name", "lookup-failed"],
)
def test_a_conflict_with_no_account_of_the_name_fails_with_gitlabs_words(
    gitlab, lookup
):
    """GitLab answers 409 also for an email another account uses: when no
    account of the name can be found, the row fails with GitLab's reason
    and why the account was not found, and nothing is recorded or issued."""
    gitlab.gl.users.create.side_effect = GitlabCreateError(
        "Email has already been taken", 409
    )
    gitlab.find.return_value = (None, lookup)

    assert create_account(_run(gitlab), ROW) == (
        False,
        with_hint(
            "GitLab did not create 'alice': 409: Email has already been taken", lookup
        ),
        None,
    )
    gitlab.pat.assert_not_called()
    assert not gitlab.records.exists()


@pytest.fixture
def existing(gitlab):
    """alice exists on GitLab (409), with the record of an account this CLI
    made and no token saved: the run to hand to create_account."""
    gitlab.gl.users.create.side_effect = CONFLICT
    return _run(gitlab, {"alice": ""}, {"alice": MADE_HERE})


def test_a_missing_token_of_an_account_made_here_is_issued_again(
    gitlab, existing, capsys
):
    """When GitLab still has that very account, its 'dtaas' tokens are
    revoked first, so a lost one is never left valid, then a new one is
    issued and handed on, and the admin is told."""
    result = create_account(existing, ROW)

    assert result == (True, "", Account("alice", 7, TOKEN, CREATED_AT))
    gitlab.find.assert_called_once_with(gitlab.gl, "alice")
    gitlab.revoke.assert_called_once_with(gitlab.gl, 7)
    gitlab.pat.assert_called_once_with(gitlab.gl, 7, "alice", accounts.USER_PAT_OPTIONS)
    assert capsys.readouterr().out == (
        "  ✅ GitLab token issued again for 'alice'.\n"
        "    This CLI created the account, and no token of it was saved.\n"
    )


@pytest.mark.parametrize(
    "found",
    [UserInfo(7, "2026-12-01T08:00:00.000Z"), UserInfo(8, CREATED_AT)],
    ids=["same-id-other-time", "other-id"],
)
def test_another_account_of_the_name_gets_no_token(gitlab, existing, found):
    """The name now belongs to an account this CLI did not create (GitLab
    gives out the same ids again after a reinstall): it is handed on as it
    is, and no token is revoked or issued."""
    gitlab.find.return_value = (found, "")

    assert create_account(existing, ROW) == (
        True,
        "",
        Account("alice", found.user_id, created_at=found.created_at),
    )
    gitlab.revoke.assert_not_called()
    gitlab.pat.assert_not_called()


@pytest.mark.parametrize(
    "found,error",
    [
        (
            (UserInfo(7, CREATED_AT, is_admin=True), ""),
            "alice is a GitLab administrator, so no token is issued.",
        ),
        ((UserInfo(7, CREATED_AT), ""), PAT_FAILED),
    ],
    ids=["administrator", "token-refused"],
)
def test_a_token_not_issued_again_fails_the_row(
    gitlab, existing, capsys, found, error
):
    """An account made an administrator since, or a token GitLab refuses,
    fails the row with why, and nothing is said to be issued. Only the
    very account this CLI made has its tokens revoked."""
    gitlab.find.return_value = found
    gitlab.pat.return_value = (False, PAT_FAILED)

    assert create_account(existing, ROW) == (False, error, None)
    assert gitlab.revoke.called is (error == PAT_FAILED)
    assert capsys.readouterr().out == ""


def test_no_token_is_issued_while_an_old_one_cannot_be_revoked(gitlab, existing):
    """A second valid token is never issued next to one an earlier run
    lost."""
    gitlab.revoke.return_value = (False, "Failed to revoke the tokens of GitLab user 7")

    assert create_account(existing, ROW) == (
        False,
        "Failed to revoke the tokens of GitLab user 7. No new token was issued.",
        None,
    )
    gitlab.pat.assert_not_called()
