"""Tests for how one user's projects are provisioned, said and recorded
(project_run.py). ensure_project is patched: its own tests are
test_project_fill.py's."""

from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from gitlab_common import (
    NoticeLevel,
    ProjectHooks,
    ProjectNotice,
    ProjectOutcome,
    ProjectRequest,
    ProjectResult,
    ensure_projects,
)

COMMON = "https://gitlab.com/dtaas/common.git"
USER = "https://gitlab.com/dtaas/user1.git"
COMMIT = "299d6e62e3addf074b2bbaffe4c5804ee096255c"
RERUN = "dtaas-services user add -s gitlab"
REQUEST = ProjectRequest(42, "alice", "common", COMMON, RERUN, "fake-user-token")
SECOND = ProjectRequest(42, "alice", "user", USER, RERUN, "fake-user-token")
CREATED = ProjectNotice(
    NoticeLevel.SUCCESS,
    "GitLab project 'alice/common' created.",
    f"Private, filled from {COMMON}",
)
NOT_RECORDED = ProjectNotice(
    NoticeLevel.ERROR,
    "GitLab project 'alice/common' not recorded.",
    "disk full\nThe next run that reaches it warns that it has content, then "
    "records it.",
)
HAS_CONTENT = ProjectNotice(
    NoticeLevel.WARNING,
    "Warning: GitLab project 'alice/common' has content.",
    "It was left as it is: no template was pushed into it.",
)
# pylint: disable=redefined-outer-name


@pytest.fixture
def run():
    """ensure_project patched to create every project, and hooks that keep
    each notice shown and each request saved (save_error, when set, is why
    a save fails)."""
    shown, saved = [], []
    state = SimpleNamespace(shown=shown, saved=saved, save_error="")

    def save(request):
        saved.append(request)
        return state.save_error

    state.hooks = ProjectHooks(show=shown.append, save=save)
    with patch(
        "gitlab_common.project_run.ensure_project",
        return_value=ProjectResult(ProjectOutcome.CREATED),
    ) as ensure:
        state.ensure = ensure
        yield state


def _provision(run, outcome, *requests):
    """ensure_projects over *requests* (REQUEST when none), with
    ensure_project answering *outcome*."""
    run.ensure.return_value = ProjectResult(outcome)
    return ensure_projects("gl", list(requests or (REQUEST,)), run.hooks)


@pytest.mark.parametrize(
    "commit,filled_from",
    [("", COMMON), (COMMIT, f"{COMMON} at commit {COMMIT}")],
    ids=["default-branch", "pinned"],
)
def test_a_created_project_is_saved_then_named(run, commit, filled_from):
    """Saved at once, then named with the template it was filled from, and
    its commit when one is pinned."""
    request = replace(REQUEST, template_commit=commit)

    assert _provision(run, ProjectOutcome.CREATED, request) == [ProjectOutcome.CREATED]

    run.ensure.assert_called_once_with("gl", request)
    assert run.saved == [request]
    assert run.shown == [replace(CREATED, detail=f"Private, filled from {filled_from}")]


def test_a_project_with_content_warns_and_is_saved(run):
    """Nothing is left to do for it, so a re-run stays quiet about it."""
    assert _provision(run, ProjectOutcome.HAS_CONTENT) == [ProjectOutcome.HAS_CONTENT]

    assert run.saved == [REQUEST]
    assert run.shown == [HAS_CONTENT]


def test_an_empty_project_found_warns_and_is_not_saved(run):
    """Never filled and never saved, so each run warns until the admin
    deletes it, naming the consumer's command."""
    assert _provision(run, ProjectOutcome.EMPTY) == [ProjectOutcome.EMPTY]

    assert not run.saved
    assert run.shown == [
        ProjectNotice(
            NoticeLevel.WARNING,
            "Warning: GitLab project 'alice/common' exists but is empty.",
            "It was not created by this run, so no template was pushed into it. "
            f"Delete it, then run '{RERUN}' again.",
        )
    ]


def test_a_failure_is_shown_as_it_is_and_not_saved(run):
    """GitLab's or git's words are the detail, unchanged."""
    run.ensure.return_value = ProjectResult(ProjectOutcome.FAILED, "quota\n[red]no")

    assert ensure_projects("gl", [REQUEST], run.hooks) == [ProjectOutcome.FAILED]

    assert not run.saved
    assert run.shown == [
        ProjectNotice(
            NoticeLevel.ERROR, "GitLab project 'alice/common' failed.", "quota\n[red]no"
        )
    ]


@pytest.mark.parametrize(
    "outcome,shown",
    [
        (ProjectOutcome.CREATED, [NOT_RECORDED]),
        (ProjectOutcome.HAS_CONTENT, [HAS_CONTENT, NOT_RECORDED]),
    ],
    ids=["created", "has-content"],
)
def test_a_project_that_cannot_be_saved_fails(run, outcome, shown):
    """A project to save whose record fails counts as failed, says what the
    next run does about it, and a created one is not announced."""
    run.save_error = "disk full"

    assert _provision(run, outcome) == [ProjectOutcome.FAILED]

    assert run.shown == shown


@pytest.mark.parametrize(
    "first",
    [ProjectResult(ProjectOutcome.FAILED, "quota reached"), RuntimeError("quota reached")],
    ids=["reported", "unexpected"],
)
def test_a_failed_project_never_stops_the_next(run, first):
    """A failure, even one the API layer did not expect, is that project's
    alone: the next is still attempted and saved."""
    run.ensure.side_effect = [first, ProjectResult(ProjectOutcome.CREATED)]

    outcomes = ensure_projects("gl", [REQUEST, SECOND], run.hooks)

    assert outcomes == [ProjectOutcome.FAILED, ProjectOutcome.CREATED]
    assert run.saved == [SECOND]
    assert run.shown[0] == ProjectNotice(
        NoticeLevel.ERROR, "GitLab project 'alice/common' failed.", "quota reached"
    )


def test_no_request_does_nothing(run):
    """A user with no missing project gets no call and no line."""
    assert not ensure_projects("gl", [], run.hooks)

    run.ensure.assert_not_called()
    assert not run.shown
