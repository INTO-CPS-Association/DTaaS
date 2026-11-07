"""Tests for shared GitLab project provisioning (gitlab_common/projects.py)."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
import requests
from gitlab.exceptions import GitlabCreateError, GitlabListError
from gitlab_common import (
    ProjectState,
    create_user_project,
    find_user_project,
)

API_FAILURES = pytest.mark.parametrize(
    "exc",
    [GitlabListError("404 User Not Found", 404), requests.ConnectionError("refused")],
    ids=["gitlab-error", "unreachable"],
)


def _project(path, **state):
    """A project as GitLab lists it, in the namespace 'alice.k'."""
    return SimpleNamespace(path=path, path_with_namespace=f"alice.k/{path}", **state)


def _gl_listing(*projects):
    """Mock client whose user project listing yields *projects*."""
    gl = MagicMock()
    gl.users.get.return_value.projects.list.return_value = iter(projects)
    return gl


@pytest.mark.parametrize(
    "state,expected",
    [
        ({"empty_repo": True}, ProjectState.EMPTY),
        ({"empty_repo": False}, ProjectState.HAS_CONTENT),
        ({}, ProjectState.HAS_CONTENT),
    ],
    ids=["empty", "content", "state-not-reported"],
)
def test_find_user_project_reports_state_and_gitlab_path(state, expected):
    """The project is looked up among the user id's own projects, and its
    path is the one GitLab reports. Only a repository GitLab reports as
    empty is EMPTY, so a caller never pushes into one it cannot see."""
    gl = _gl_listing(_project("common", **state))
    lookup = find_user_project(gl, 42, "common")
    assert (lookup.state, lookup.error, lookup.path) == (expected, "", "alice.k/common")
    gl.users.get.assert_called_once_with(42, lazy=True)
    gl.users.get.return_value.projects.list.assert_called_once_with(
        search="common", iterator=True
    )


def test_find_user_project_matches_the_path_exactly():
    """A search hit whose path only contains the name is not the project."""
    gl = _gl_listing(_project("common-old"), _project("my-common"))
    lookup = find_user_project(gl, 42, "common")
    assert (lookup.state, lookup.path) == (ProjectState.MISSING, "")


@API_FAILURES
def test_find_user_project_failure_keeps_the_reason(exc):
    """An unknown user id or an unreachable instance is FAILED with the
    project, the user id and GitLab's own words, never raised."""
    gl = MagicMock()
    gl.users.get.return_value.projects.list.side_effect = exc
    lookup = find_user_project(gl, 42, "common")
    assert lookup.state is ProjectState.FAILED
    assert "'common'" in lookup.error
    assert "42" in lookup.error
    assert str(exc) in lookup.error


def test_create_user_project_posts_a_private_empty_project():
    """The project goes into the user's namespace through the admin endpoint,
    private, with no import_url, and its GitLab path is returned."""
    gl = MagicMock()
    created = gl.users.get.return_value.projects.create
    created.return_value = _project("common")
    assert create_user_project(gl, 42, "common") == (True, "alice.k/common")
    gl.users.get.assert_called_once_with(42, lazy=True)
    created.assert_called_once_with(
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
