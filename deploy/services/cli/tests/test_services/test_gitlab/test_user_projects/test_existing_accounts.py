"""Tests for the project step with accounts that were there before the run
(user_projects.py): each comes with the id and creation time the account
step found, its record counts only when it belongs to that account, and the
push needs a saved token."""

import pytest
from dtaas_services.pkg.services.gitlab.user_projects import (
    ProjectTally,
    provision_projects,
)
from tests.test_services.test_gitlab.test_user_projects.conftest import (
    CREATED_AT,
    FOUND_ALICE,
    OLD_CREATED_AT,
    RERUN,
    SAVED_TOKEN,
    read_json,
    record,
    requests_of,
    write_json,
)
# pylint: disable=W0621


def test_an_existing_account_uses_its_saved_token_and_found_id(gitlab):
    """An account made by an earlier run gets its projects with the id the
    account step found, and pushes with the token saved for it."""
    write_json(gitlab.tokens, {"alice": SAVED_TOKEN, "bob": "other"})

    tally = provision_projects(gitlab.run, [FOUND_ALICE])

    assert [r.user_id for r in requests_of(gitlab.ensure)] == [7, 7]
    assert {r.token for r in requests_of(gitlab.ensure)} == {SAVED_TOKEN}
    assert not tally.failed
    assert read_json(gitlab.records)["alice"] == record(
        7, CREATED_AT, ["common", "user"], created=False
    )


def test_an_existing_account_whose_record_is_done_is_left_alone(gitlab, capsys):
    """A record of this very account with both projects finished costs
    nothing: no git check, no project call, no line."""
    write_json(gitlab.records, {"alice": record(7, CREATED_AT, ["common", "user"])})

    tally = provision_projects(gitlab.run, [FOUND_ALICE])

    assert tally == ProjectTally()
    gitlab.git.assert_not_called()
    gitlab.ensure.assert_not_called()
    assert capsys.readouterr().out == ""


def test_an_existing_account_with_another_accounts_record_is_attempted(gitlab):
    """A finished record of an earlier account of the same name does not
    count: the account's projects are attempted again (and ensure_project
    checks the token belongs to it before it creates anything)."""
    write_json(gitlab.tokens, {"alice": SAVED_TOKEN})
    write_json(
        gitlab.records, {"alice": record(7, OLD_CREATED_AT, ["common", "user"])}
    )

    provision_projects(gitlab.run, [FOUND_ALICE])

    assert [r.name for r in requests_of(gitlab.ensure)] == ["common", "user"]


@pytest.mark.parametrize(
    "saved,in_detail",
    [
        (None, ""),
        ({"bob": SAVED_TOKEN}, ""),
        ({"alice": 5}, ""),
        ("{not json", "Failed to read"),
    ],
    ids=["no-file", "other-user", "not-a-string", "unreadable"],
)
def test_an_existing_account_without_a_saved_token_fails(
    gitlab, capsys, saved, in_detail
):
    """Without a token of the user's own, no project is attempted and the
    user fails, with how to finish. An unreadable token file says why."""
    if isinstance(saved, dict):
        write_json(gitlab.tokens, saved)
    elif saved is not None:
        gitlab.tokens.write_text(saved, encoding="utf-8")

    tally = provision_projects(gitlab.run, [FOUND_ALICE])

    assert tally.failed == ["alice"]
    gitlab.ensure.assert_not_called()
    out = capsys.readouterr().out
    assert "  GitLab projects for 'alice' skipped.\n" in out
    assert "none is saved for 'alice' in config/gitlab_user_tokens.json" in out
    assert f"then run '{RERUN}' again." in out
    assert in_detail in out
