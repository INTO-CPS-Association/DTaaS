"""Tests for setup_gitlab_users: the account step, the token file and the
project step put together (users.py)."""

import json

import pytest
from dtaas_services.pkg.services.gitlab import users
from dtaas_services.pkg.services.gitlab.accounts import AccountRun
from dtaas_services.pkg.services.gitlab.project_state import UserRecord
from dtaas_services.pkg.services.gitlab.user_projects import (
    Account,
    ProjectRun,
    ProjectTally,
)
from tests.test_services.test_gitlab.conftest import write_text
from tests.test_services.test_gitlab.test_users.conftest import TEMPLATES, TEST_TOKEN
# pylint: disable=W0212, W0621

NEW = Account("user1", 1, TEST_TOKEN)
EXISTING = Account("existing", 2)
CREATED_AT = "2026-11-10T09:14:31.123Z"
SAVED_RECORD = {"id": 4, "created_at": CREATED_AT, "created": True, "projects": []}


def test_new_tokens_are_merged_into_the_token_file(setup):
    """A run that adds a user keeps the tokens of the users added before."""
    write_text(setup.tokens, json.dumps({"old": "old-token"}))
    setup.process.return_value = (True, "", [NEW, EXISTING])

    success, msg = users.setup_gitlab_users()

    assert success is True
    assert msg == f"GitLab users created successfully. Tokens saved to {setup.tokens}"
    assert json.loads(setup.tokens.read_text(encoding="utf-8")) == {
        "old": "old-token",
        "user1": TEST_TOKEN,
    }


def test_the_account_step_gets_the_saved_tokens_and_the_records(setup):
    """The account step runs with the admin client, the tokens saved by
    earlier runs and the records, so it can tell an account this CLI made
    that has no token."""
    write_text(setup.tokens, json.dumps({"old": "old-token"}))
    write_text(setup.records, json.dumps({"old": SAVED_RECORD}))
    setup.process.return_value = (True, "", [])

    users.setup_gitlab_users()

    run = setup.process.call_args.args[0]
    assert run == AccountRun(
        "gl", {"old": "old-token"}, {"old": UserRecord(4, CREATED_AT, True)}
    )


def test_both_user_files_are_made_before_any_account(setup):
    """A first run makes both files, empty, before the account step, so a
    token is never issued that could not be saved."""
    setup.process.side_effect = lambda *_: (
        (True, "", [])
        if setup.tokens.read_text(encoding="utf-8") == "{}"
        and setup.records.read_text(encoding="utf-8") == "{}"
        else (False, "files missing", [])
    )

    assert users.setup_gitlab_users() == (True, "GitLab users created successfully")


@pytest.mark.parametrize("name", ["tokens", "records"])
@pytest.mark.parametrize("content", ["{not json", "[1]"])
def test_an_unusable_user_file_stops_the_step_before_any_user(setup, name, content):
    """A token or records file that cannot be read stops the step before
    any account or token is made, and is left for the admin to look at."""
    path = getattr(setup, name)
    write_text(path, content)

    success, msg = users.setup_gitlab_users()

    assert success is False
    assert msg.startswith(f"config/{path.name} cannot be used: ")
    assert path.read_text(encoding="utf-8") == content
    setup.client.assert_not_called()
    setup.process.assert_not_called()


def test_tokens_that_cannot_be_saved_after_all_fail_the_step(setup, mocker):
    """A token file that turns unusable during the run (checked fine at its
    start) fails the step with why: the next run issues the lost tokens of
    the accounts this CLI made again."""
    mocker.patch(
        f"{users.__name__}.merge_tokens",
        return_value=(False, "Failed to save tokens to t: disk full"),
    )
    setup.process.return_value = (True, "", [NEW])

    assert users.setup_gitlab_users() == (
        False,
        "Failed to save tokens to t: disk full",
    )


def test_the_project_step_gets_the_run_and_every_account(setup):
    """The accounts in place, new or existing, go to the project step with
    the admin client, the templates and the user token file."""
    setup.process.return_value = (True, "", [NEW, EXISTING])

    users.setup_gitlab_users()

    setup.projects.assert_called_once_with(
        ProjectRun("gl", TEMPLATES, setup.tokens), [NEW, EXISTING]
    )


@pytest.mark.parametrize(
    "prereq,templates",
    [
        ((False, "Token file not found", None), ({}, "")),
        ((True, "pat", None), ({}, "Invalid settings in config/services.env: x.")),
    ],
    ids=["no-admin-pat", "bad-templates"],
)
def test_nothing_is_touched_when_the_step_cannot_start(setup, prereq, templates):
    """A missing admin PAT or a bad template setting stops the step before
    any user or file is touched."""
    setup.prereq.return_value = prereq
    setup.templates.return_value = templates

    success, msg = users.setup_gitlab_users()

    assert success is False
    assert msg in (prereq[1], templates[1])
    setup.client.assert_not_called()
    setup.process.assert_not_called()
    assert not setup.tokens.exists()
    assert not setup.records.exists()


def test_a_failed_row_keeps_the_tokens_of_the_others(setup):
    """Tokens are saved even when a row failed, and the error is reported."""
    setup.process.return_value = (False, "user2: API error", [NEW])

    success, msg = users.setup_gitlab_users()

    assert success is False
    assert msg == (
        f"GitLab users partially created. Tokens saved to {setup.tokens}\n"
        "Errors:\nuser2: API error"
    )
    assert json.loads(setup.tokens.read_text(encoding="utf-8")) == {"user1": TEST_TOKEN}


@pytest.mark.parametrize(
    "result,tally,expected",
    [
        ((True, "Done"), ProjectTally(), (True, "Done")),
        (
            (True, "Done. Tokens saved to t"),
            ProjectTally(created=2),
            (True, "Done. Tokens saved to t. 2 GitLab projects created."),
        ),
        (
            (True, "Done"),
            ProjectTally(failed=["alice"]),
            (False, "Done. GitLab projects failed for alice: see the lines above."),
        ),
        (
            (False, "Partly done.\nErrors:\nbob: x"),
            ProjectTally(created=1),
            (False, "Partly done. 1 GitLab project created.\nErrors:\nbob: x"),
        ),
    ],
    ids=["no-projects", "created", "project-failed", "row-failed"],
)
def test_the_project_summary_joins_the_first_line(result, tally, expected):
    """'user add' prints the first line of the result, so the project part
    goes there, and a failed project fails the GitLab step."""
    assert users._with_projects(result, tally) == expected
