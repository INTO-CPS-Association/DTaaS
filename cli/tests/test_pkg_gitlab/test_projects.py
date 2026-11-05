"""Tests for creating and filling one GitLab project (pkg/gitlab/projects.py)."""

from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from src.gitlab_common import ProjectLookup, ProjectState
from src.pkg.gitlab import ProjectOutcome, ProjectRequest, ensure_project
from src.pkg.gitlab.repos import GitAccess, TemplateCopy

TEMPLATE = "https://gitlab.com/dtaas/common.git"
REQUEST = ProjectRequest(42, "alice", "common", TEMPLATE)
GL = SimpleNamespace(
    url="https://gitlab.example.com", private_token="t", ssl_verify=True
)
MODULE = "src.pkg.gitlab.projects"


@contextmanager
def _gitlab(state, created=(True, ""), pushed=""):
    """Patch the lookup, the create call and the git copy of projects.py."""
    with patch(
        f"{MODULE}.find_project", return_value=ProjectLookup(state)
    ) as find, patch(
        f"{MODULE}.create_user_project", return_value=created
    ) as create, patch(f"{MODULE}.copy_template", return_value=pushed) as copy:
        yield SimpleNamespace(find=find, create=create, copy=copy)


def test_a_missing_project_is_created_then_filled():
    """The project is created in the user's namespace, then the template is
    pushed to it with the admin client's settings."""
    with _gitlab(ProjectState.MISSING) as calls:
        result = ensure_project(GL, REQUEST)
    assert result.outcome is ProjectOutcome.CREATED
    calls.find.assert_called_once_with(GL, "alice/common")
    calls.create.assert_called_once_with(GL, 42, "common")
    calls.copy.assert_called_once_with(
        GitAccess("https://gitlab.example.com", "t", True),
        TemplateCopy(TEMPLATE, "alice/common"),
    )


def test_an_empty_project_is_filled_without_creating_it():
    """An empty project (a failed push leaves one) is filled, not created."""
    with _gitlab(ProjectState.EMPTY) as calls:
        result = ensure_project(GL, REQUEST)
    assert result.outcome is ProjectOutcome.FILLED
    calls.create.assert_not_called()
    calls.copy.assert_called_once()


def test_a_project_with_content_is_not_touched():
    """Content is never overwritten: no create, no push."""
    with _gitlab(ProjectState.HAS_CONTENT) as calls:
        result = ensure_project(GL, REQUEST)
    assert result.outcome is ProjectOutcome.HAS_CONTENT
    calls.create.assert_not_called()
    calls.copy.assert_not_called()


def test_a_failed_lookup_is_a_failure():
    """When GitLab cannot say what is there, nothing is created or pushed."""
    lookup = ProjectLookup(ProjectState.FAILED, "Failed to look up 'alice/common'")
    with _gitlab(ProjectState.FAILED) as calls:
        calls.find.return_value = lookup
        result = ensure_project(GL, REQUEST)
    assert (result.outcome, result.message) == (ProjectOutcome.FAILED, lookup.error)
    calls.create.assert_not_called()
    calls.copy.assert_not_called()


def test_a_failed_create_pushes_nothing():
    """A project that could not be created gets no push."""
    with _gitlab(ProjectState.MISSING, created=(False, "quota reached")) as calls:
        result = ensure_project(GL, REQUEST)
    assert (result.outcome, result.message) == (ProjectOutcome.FAILED, "quota reached")
    calls.copy.assert_not_called()


@pytest.mark.parametrize("state", [ProjectState.MISSING, ProjectState.EMPTY])
def test_a_failed_push_says_how_to_finish(state):
    """The project stays, empty, and the message says a re-run fills it."""
    with _gitlab(state, pushed="Could not clone x."):
        result = ensure_project(GL, REQUEST)
    assert result.outcome is ProjectOutcome.FAILED
    assert result.message.splitlines() == [
        "Could not clone x.",
        "The project is left empty; 'dtaas user add alice' fills it.",
    ]
