"""Tests for setup_gitlab_users: the account step, the token file and the
project step put together (users.py)."""

import json

import pytest
from dtaas_services.pkg.services.gitlab import users
from dtaas_services.pkg.services.gitlab.user_projects import (
    Account,
    ProjectRun,
    ProjectTally,
)
from tests.test_services.test_gitlab.conftest import write_text
from tests.test_services.test_gitlab.test_users.conftest import TEMPLATES, TEST_TOKEN
# pylint: disable=W0212, W0621

NEW = Account("user1", 1, TEST_TOKEN)


def test_new_tokens_are_merged_into_the_token_file(setup):
    """A run that adds a user keeps the tokens of the users added before."""
    write_text(setup.tokens, json.dumps({"old": "old-token"}))
    setup.process.return_value = (True, "", [NEW, Account("existing")])

    success, msg = users.setup_gitlab_users()

    assert success is True
    assert msg == f"GitLab users created successfully. Tokens saved to {setup.tokens}"
    assert json.loads(setup.tokens.read_text(encoding="utf-8")) == {
        "old": "old-token",
        "user1": TEST_TOKEN,
    }


def test_an_unreadable_token_file_is_never_overwritten(setup):
    """The step fails and the file is left for the admin to look at."""
    write_text(setup.tokens, "{not json")
    setup.process.return_value = (True, "", [NEW])

    success, msg = users.setup_gitlab_users()

    assert success is False
    assert msg.startswith(f"Failed to save tokens to {setup.tokens}")
    assert setup.tokens.read_text(encoding="utf-8") == "{not json"


def test_the_project_step_gets_the_run_and_every_account(setup):
    """The accounts in place, new or existing, go to the project step with
    the admin client, the templates and the user token file."""
    setup.process.return_value = (True, "", [NEW, Account("existing")])

    users.setup_gitlab_users()

    setup.projects.assert_called_once_with(
        ProjectRun("gl", TEMPLATES, setup.tokens), [NEW, Account("existing")]
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
    any user is created."""
    setup.prereq.return_value = prereq
    setup.templates.return_value = templates

    success, msg = users.setup_gitlab_users()

    assert success is False
    assert msg in (prereq[1], templates[1])
    setup.client.assert_not_called()
    setup.process.assert_not_called()


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
