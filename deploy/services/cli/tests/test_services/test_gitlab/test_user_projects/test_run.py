"""Tests for what a whole run of the project step does (user_projects.py):
nothing without templates, every user failed when git or the records file
cannot be used, and one failure never stopping the next project."""

import pytest
from dtaas_services.gitlab_common import ProjectOutcome, ProjectResult
from dtaas_services.pkg.services.gitlab.user_projects import (
    ProjectRun,
    ProjectTally,
    provision_projects,
)
from tests.test_services.test_gitlab.test_user_projects.conftest import (
    CREATED,
    NEW_ALICE,
    NEW_BOB,
    read_json,
)
# pylint: disable=W0621


def test_without_templates_nothing_happens(gitlab):
    """Both template keys left out means accounts and tokens only."""
    run = ProjectRun("gl", {}, gitlab.run.tokens_path)

    assert provision_projects(run, [NEW_ALICE]) == ProjectTally()
    gitlab.git.assert_not_called()
    gitlab.ensure.assert_not_called()


def test_without_git_every_user_with_work_fails(gitlab, capsys):
    """git is checked once, before any project: without it no project is
    touched and every user who needed one fails."""
    gitlab.git.return_value = "git is not installed, or not on PATH."

    tally = provision_projects(gitlab.run, [NEW_ALICE, NEW_BOB])

    assert tally.failed == ["alice", "bob"]
    gitlab.git.assert_called_once()
    gitlab.ensure.assert_not_called()
    out = capsys.readouterr().out
    assert "  GitLab projects skipped for every user.\n" in out
    assert "    git is not installed, or not on PATH.\n" in out


@pytest.mark.parametrize("content", ["{not json", "[1]"])
def test_an_unreadable_records_file_fails_every_user(gitlab, capsys, content):
    """Without knowing what is finished, no project is touched, and the file
    is left as it is."""
    gitlab.records.write_text(content, encoding="utf-8")

    tally = provision_projects(gitlab.run, [NEW_ALICE])

    assert tally.failed == ["alice"]
    gitlab.ensure.assert_not_called()
    assert gitlab.records.read_text(encoding="utf-8") == content
    assert "config/gitlab_user_projects.json cannot be read" in capsys.readouterr().out


@pytest.mark.parametrize(
    "first",
    [ProjectResult(ProjectOutcome.FAILED, "Could not clone x."), RuntimeError("boom")],
    ids=["reported", "unexpected"],
)
def test_a_failed_project_never_stops_the_next(gitlab, capsys, first):
    """A failure is this project's alone, an unexpected exception included:
    it fails the user, and the user's next project and the next user are
    still attempted."""
    gitlab.ensure.side_effect = [first, CREATED, CREATED, CREATED]

    tally = provision_projects(gitlab.run, [NEW_ALICE, NEW_BOB])

    assert tally == ProjectTally(created=3, failed=["alice"])
    records = read_json(gitlab.records)
    assert records["alice"]["projects"] == ["user"]
    assert records["bob"]["projects"] == ["common", "user"]
    assert "  GitLab project 'alice/common' failed.\n" in capsys.readouterr().out
