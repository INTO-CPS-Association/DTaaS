"""Tests for shared GitLab project provisioning (gitlab_common/projects.py)."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
import requests
from gitlab.exceptions import GitlabCreateError, GitlabGetError
from gitlab_common import (
    ProjectState,
    create_user_project,
    find_project,
)


def _gl_returning(project):
    """Mock client whose project lookup returns *project*."""
    gl = MagicMock()
    gl.projects.get.return_value = project
    return gl


def _gl_raising(exc):
    """Mock client whose project lookup raises *exc*."""
    gl = MagicMock()
    gl.projects.get.side_effect = exc
    return gl


@pytest.mark.parametrize(
    "project,state",
    [
        (SimpleNamespace(empty_repo=True), ProjectState.EMPTY),
        (SimpleNamespace(empty_repo=False), ProjectState.HAS_CONTENT),
        (SimpleNamespace(), ProjectState.HAS_CONTENT),
    ],
    ids=["empty", "content", "state-not-reported"],
)
def test_find_project_reports_the_repository_state(project, state):
    """Only a repository GitLab reports as empty is EMPTY, so a caller never
    pushes into one whose state it cannot see."""
    gl = _gl_returning(project)
    lookup = find_project(gl, "alice/common")
    assert lookup.state is state
    assert lookup.error == ""
    gl.projects.get.assert_called_once_with("alice/common")


def test_find_project_missing_on_404():
    """A 404 means there is no project at that path: MISSING, not a failure."""
    lookup = find_project(_gl_raising(GitlabGetError("Not found", 404)), "alice/common")
    assert lookup.state is ProjectState.MISSING
    assert lookup.error == ""


@pytest.mark.parametrize(
    "exc",
    [GitlabGetError("Forbidden", 403), requests.ConnectionError("refused")],
    ids=["gitlab-error", "unreachable"],
)
def test_find_project_failure_keeps_the_reason(exc):
    """Any other error is FAILED with the path and GitLab's own words, and
    an unreachable instance is reported, never raised."""
    lookup = find_project(_gl_raising(exc), "alice/common")
    assert lookup.state is ProjectState.FAILED
    assert "alice/common" in lookup.error
    assert str(exc) in lookup.error


def test_create_user_project_posts_a_private_empty_project():
    """The project goes into the user's namespace through the admin endpoint,
    private, with no import_url."""
    gl = MagicMock()
    ok, error = create_user_project(gl, 42, "common")
    assert (ok, error) == (True, "")
    gl.users.get.assert_called_once_with(42, lazy=True)
    gl.users.get.return_value.projects.create.assert_called_once_with(
        {"name": "common", "path": "common", "visibility": "private"}
    )


@pytest.mark.parametrize(
    "exc",
    [
        GitlabCreateError("has already been taken", 400),
        requests.ConnectionError("refused"),
    ],
    ids=["gitlab-error", "unreachable"],
)
def test_create_user_project_failure_keeps_the_reason(exc):
    """A failed create names the project and the user and keeps GitLab's
    words; it is returned, never raised."""
    gl = MagicMock()
    gl.users.get.return_value.projects.create.side_effect = exc
    ok, error = create_user_project(gl, 42, "user")
    assert ok is False
    assert "'user'" in error
    assert "42" in error
    assert str(exc) in error
