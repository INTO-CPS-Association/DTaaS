"""Tests for how the project step prints gitlab_common's notices and records
each finished project (project_report.py). Which outcome gives which notice,
and which outcomes are recorded, is tested with gitlab_common
(lib/gitlab_common/tests/test_project_run.py)."""

from dataclasses import replace

import pytest
from dtaas_services.gitlab_common import NoticeLevel, ProjectNotice, ProjectRequest
from dtaas_services.pkg.services.gitlab import project_state, tokens_file
from dtaas_services.pkg.services.gitlab.project_report import (
    RERUN,
    ProjectTally,
    UserProgress,
    show,
)
from dtaas_services.pkg.services.gitlab.project_state import UserRecord
# pylint: disable=W0621

COMMON = "https://gitlab.com/dtaas/common.git"
REQUEST = ProjectRequest(42, "alice", "common", COMMON, RERUN, "fake-user-token")
RECORD = UserRecord(42, "2026-11-10T09:14:31.123Z", created=True, projects=("user",))
BOTH = replace(RECORD, projects=("user", "common"))


@pytest.fixture
def base_dir(mocker, tmp_path):
    """The project base dir, so the records file, in tmp_path."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    return tmp_path


@pytest.mark.parametrize(
    "level,mark",
    [(NoticeLevel.SUCCESS, "✅ "), (NoticeLevel.WARNING, "⚠️  "), (NoticeLevel.ERROR, "")],
    ids=["success", "warning", "error"],
)
def test_a_notice_is_printed_with_its_mark_and_detail_below(capsys, level, mark):
    """The line opens with its level's mark, each line of the detail is
    indented below it, and GitLab's or git's words are never read as
    markup."""
    show(ProjectNotice(level, "GitLab project 'alice/common' x.", "one\n[red]two[/red]"))

    assert capsys.readouterr().out == (
        f"  {mark}GitLab project 'alice/common' x.\n"
        "    one\n"
        "    [red]two[/red]\n"
    )


@pytest.mark.usefixtures("base_dir")
def test_a_finished_project_is_added_to_the_record_at_once():
    """The record keeps its account and the sign that this CLI made it, and
    each project saved is on disk before the next one is attempted."""
    progress = UserProgress(RECORD)

    assert progress.save(REQUEST) == ""

    assert progress.record == BOTH
    assert project_state.read_records()[0] == {"alice": BOTH}


@pytest.mark.usefixtures("base_dir")
def test_a_record_that_cannot_be_saved_says_why():
    """An unusable records file is left as it is, and the reason goes back
    to gitlab_common, which fails the project with it."""
    path = project_state.get_projects_path()
    path.parent.mkdir()
    path.write_text("{not json", encoding="utf-8")

    error = UserProgress(RECORD).save(REQUEST)

    assert error.startswith("config/gitlab_user_projects.json cannot be written: ")
    assert path.read_text(encoding="utf-8") == "{not json"


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
