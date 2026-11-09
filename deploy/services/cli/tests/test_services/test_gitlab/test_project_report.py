"""Tests for how each project's outcome is printed and recorded
(project_report.py)."""

import pytest
from dtaas_services.gitlab_common import ProjectOutcome, ProjectRequest, ProjectResult
from dtaas_services.pkg.services.gitlab import project_state, tokens_file
from dtaas_services.pkg.services.gitlab.project_report import (
    RERUN,
    ProjectTally,
    UserProgress,
    report,
)
# pylint: disable=W0621

COMMON = "https://gitlab.com/dtaas/common.git"
REQUEST = ProjectRequest(42, "alice", "common", COMMON, RERUN, "fake-user-token")


@pytest.fixture
def alice(mocker, tmp_path):
    """alice's progress, with 'user' finished, and the project base dir,
    so the finished projects file, in tmp_path."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    return UserProgress(["user"], ProjectTally())


def _finished():
    """The finished projects as the next run reads them."""
    return project_state.read_finished()[0]


def test_a_created_project_is_recorded_counted_and_named(alice, capsys):
    """Recorded at once, with the template it was filled from."""
    assert report(REQUEST, ProjectResult(ProjectOutcome.CREATED), alice) is True

    assert _finished() == {"alice": ["user", "common"]}
    assert alice.tally == ProjectTally(created=1)
    assert capsys.readouterr().out == (
        "  ✅ GitLab project 'alice/common' created.\n"
        f"    Private, filled from {COMMON}\n"
    )


def test_a_project_with_content_warns_once_and_is_recorded(alice, capsys):
    """Nothing is left to do for it, so a re-run stays quiet about it."""
    assert report(REQUEST, ProjectResult(ProjectOutcome.HAS_CONTENT), alice) is True

    assert _finished() == {"alice": ["user", "common"]}
    assert alice.tally == ProjectTally()
    assert capsys.readouterr().out == (
        "  ⚠️  Warning: GitLab project 'alice/common' has content.\n"
        "    It was left as it is: no template was pushed into it.\n"
    )


def test_an_empty_project_found_keeps_warning(alice, capsys):
    """Never filled and never recorded, so each run warns until the admin
    deletes it."""
    assert report(REQUEST, ProjectResult(ProjectOutcome.EMPTY), alice) is True

    assert not _finished()
    out = capsys.readouterr().out
    assert "  ⚠️  Warning: GitLab project 'alice/common' exists but is empty.\n" in out
    assert f"Delete it, then run '{RERUN}' again.\n" in out


def test_a_failure_is_printed_as_it_is_and_not_recorded(alice, capsys):
    """Git's words are shown line by line, never read as markup."""
    failed = ProjectResult(ProjectOutcome.FAILED, "Could not clone x.\n[red]no[/red]")

    assert report(REQUEST, failed, alice) is False

    assert not _finished()
    assert capsys.readouterr().out == (
        "  GitLab project 'alice/common' failed.\n"
        "    Could not clone x.\n"
        "    [red]no[/red]\n"
    )


def test_a_project_that_cannot_be_recorded_fails(alice, capsys):
    """A created project whose record cannot be saved is a failure, with
    what the next run does about it, and is not counted as created."""
    path = project_state.get_projects_path()
    path.parent.mkdir()
    path.write_text("{not json", encoding="utf-8")

    assert report(REQUEST, ProjectResult(ProjectOutcome.CREATED), alice) is False

    assert alice.tally == ProjectTally()
    out = capsys.readouterr().out
    assert out.startswith("  GitLab project 'alice/common' not recorded.\n")
    assert "The next run that reaches it warns that it has content" in out
    assert "created." not in out


@pytest.mark.parametrize(
    "tally,summary",
    [
        (ProjectTally(), ""),
        (ProjectTally(created=1), "1 GitLab project created."),
        (
            ProjectTally(created=3, failed=["alice", "bob"]),
            "3 GitLab projects created. GitLab projects failed for alice, bob: "
            "see the lines above.",
        ),
    ],
    ids=["nothing", "one", "some-failed"],
)
def test_the_summary_counts_projects(tally, summary):
    """The result line's part: created projects, then the users that failed."""
    assert tally.summary() == summary
