"""Tests for the project step with accounts this run created or issued a
token for (user_projects.py): their id, token and creation time come from
the account step, and their record is theirs only when it belongs to them."""

import pytest
from dtaas_services.gitlab_common import ProjectRequest
from dtaas_services.pkg.services.gitlab.user_projects import (
    ProjectTally,
    provision_projects,
)
from tests.test_services.test_gitlab.test_user_projects.conftest import (
    COMMIT,
    COMMON,
    CREATED_AT,
    NEW_ALICE,
    NEW_BOB,
    NEW_TOKEN,
    OLD_CREATED_AT,
    RERUN,
    USER,
    read_json,
    record,
    requests_of,
    write_json,
)
# pylint: disable=W0621


def test_a_new_account_gets_both_projects_recorded(gitlab, capsys):
    """Both projects are made in the user's namespace with the id and token
    of this run, in template order, each from its template (at its pinned
    commit, if any), and added to the record the account step saved, so a
    re-run never makes them again."""
    write_json(gitlab.records, {"alice": record(42, CREATED_AT, [])})

    tally = provision_projects(gitlab.run, [NEW_ALICE])

    assert requests_of(gitlab.ensure) == [
        ProjectRequest(42, "alice", "common", COMMON, RERUN, NEW_TOKEN, COMMIT),
        ProjectRequest(42, "alice", "user", USER, RERUN, NEW_TOKEN, ""),
    ]
    gitlab.find.assert_not_called()
    assert read_json(gitlab.records) == {
        "alice": record(42, CREATED_AT, ["common", "user"])
    }
    assert tally == ProjectTally(created=2)
    out = capsys.readouterr().out
    assert (
        "  ✅ GitLab project 'alice/common' created.\n"
        f"    Private, filled from {COMMON} at commit {COMMIT}\n"
    ) in out
    assert NEW_TOKEN not in out


@pytest.mark.parametrize(
    "stale",
    [
        record(42, OLD_CREATED_AT, ["common", "user"]),
        record(3, OLD_CREATED_AT, ["common", "user"]),
        ["common", "user"],
    ],
    ids=["same-id-reinstalled", "another-id", "list-of-an-earlier-version"],
)
def test_a_new_account_with_a_stale_record_gets_its_projects(gitlab, stale):
    """After 'service clean' and a reinstall (where GitLab gives out the
    same ids again), or a user deleted and added again, the old record
    belongs to another account: the new one still gets both projects, and
    its own record replaces the old one."""
    write_json(gitlab.records, {"alice": stale})

    tally = provision_projects(gitlab.run, [NEW_ALICE])

    assert tally == ProjectTally(created=2)
    assert [r.name for r in requests_of(gitlab.ensure)] == ["common", "user"]
    assert read_json(gitlab.records) == {
        "alice": record(42, CREATED_AT, ["common", "user"], created=False)
    }


def test_finished_projects_are_skipped(gitlab):
    """A recorded project of the account is never looked up again: only the
    missing one is made, and a user with both recorded costs no git check
    at all."""
    write_json(
        gitlab.records,
        {
            "alice": record(42, CREATED_AT, ["common"]),
            "bob": record(9, CREATED_AT, ["common", "user"]),
        },
    )

    provision_projects(gitlab.run, [NEW_ALICE, NEW_BOB])

    assert [r.name for r in requests_of(gitlab.ensure)] == ["user"]
    assert read_json(gitlab.records)["alice"]["projects"] == ["common", "user"]

    gitlab.git.reset_mock()
    provision_projects(gitlab.run, [NEW_BOB])
    gitlab.git.assert_not_called()


def test_the_token_is_kept_out_of_the_account_repr():
    """An account printed in a traceback or a log never shows the token."""
    assert NEW_TOKEN not in repr(NEW_ALICE)
