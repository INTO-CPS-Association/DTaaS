"""Tests for creating and filling one GitLab project (project_fill.py)."""

from contextlib import contextmanager
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from gitlab_common import (
    ProjectLookup,
    ProjectOutcome,
    ProjectRequest,
    ProjectState,
    ensure_project,
)
from gitlab_common.repos import GitAccess

TEMPLATE = "https://gitlab.com/dtaas/common.git"
USER_TOKEN = "fake-alice-token"  # noqa: S105 # NOSONAR
RERUN = "dtaas user add alice"
COMMIT = "299d6e62e3addf074b2bbaffe4c5804ee096255c"
REQUEST = ProjectRequest(42, "alice", "common", TEMPLATE, RERUN, USER_TOKEN)
GL = SimpleNamespace(
    url="https://gitlab.example.com", private_token="t", ssl_verify=True
)
MODULE = "gitlab_common.project_fill"
GITLAB_PATH = "alice.k/common"


@contextmanager
def _gitlab(lookup, created=(True, GITLAB_PATH), clone_error="", pushed=""):
    """Patch the lookup, the token check (it passes), the template clone and
    the create call of projects.py: the clone's push answers *pushed*."""
    clone = MagicMock(error=clone_error)
    clone.push.return_value = pushed
    with patch(f"{MODULE}.find_user_project", return_value=lookup) as find, patch(
        f"{MODULE}.create_user_project", return_value=created
    ) as create, patch(f"{MODULE}.cloned_template") as cloned, patch(
        f"{MODULE}.push_problem", return_value=""
    ) as checked:
        cloned.return_value.__enter__.return_value = clone
        yield SimpleNamespace(
            find=find, create=create, cloned=cloned, clone=clone, checked=checked
        )


MISSING = ProjectLookup(ProjectState.MISSING)


def test_a_missing_project_is_created_then_pushed_as_the_user():
    """The project is looked up by user id, the user's token is checked,
    the template is cloned at its default branch with the admin client's URL
    and TLS setting (no token), the project is created, and the push goes to
    the path GitLab gave it, with the user's token."""
    with _gitlab(MISSING) as calls:
        result = ensure_project(GL, REQUEST)
    assert result.outcome is ProjectOutcome.CREATED
    calls.find.assert_called_once_with(GL, 42, "common")
    calls.checked.assert_called_once_with(GL, REQUEST)
    calls.cloned.assert_called_once_with(
        GitAccess("https://gitlab.example.com", "", True), TEMPLATE, ""
    )
    calls.create.assert_called_once_with(GL, 42, "common")
    calls.clone.push.assert_called_once_with(GITLAB_PATH, USER_TOKEN)


def test_a_pinned_commit_reaches_the_clone():
    """The request's template commit is the one cloned and pushed."""
    pinned = replace(REQUEST, template_commit=COMMIT)
    with _gitlab(MISSING) as calls:
        ensure_project(GL, pinned)
    assert calls.cloned.call_args.args[1:] == (TEMPLATE, COMMIT)


def test_a_token_that_cannot_push_creates_nothing():
    """The token is checked before anything else: one that cannot push as
    the user stops the project before the clone and the create call."""
    with _gitlab(MISSING) as calls:
        calls.checked.return_value = "alice's token is not active."
        result = ensure_project(GL, REQUEST)
    assert (result.outcome, result.message) == (
        ProjectOutcome.FAILED,
        "alice's token is not active.",
    )
    calls.cloned.assert_not_called()
    calls.create.assert_not_called()


def test_the_request_names_the_project_as_the_user_knows_it():
    """Messages name the project by username, not GitLab's namespace."""
    assert REQUEST.path == "alice/common"


def test_the_token_is_kept_out_of_the_request_repr():
    """A request printed in a traceback or a log never shows the token."""
    assert USER_TOKEN not in repr(REQUEST)


def test_an_unusable_template_creates_no_project():
    """The template is cloned first: one that cannot be cloned or pushed
    (LFS, no commits) fails before any project exists."""
    with _gitlab(MISSING, clone_error="Could not clone x.") as calls:
        result = ensure_project(GL, REQUEST)
    assert (result.outcome, result.message) == (
        ProjectOutcome.FAILED,
        "Could not clone x.",
    )
    calls.create.assert_not_called()


def test_a_failed_create_pushes_nothing():
    """A project that could not be created gets no push."""
    with _gitlab(MISSING, created=(False, "quota reached")) as calls:
        result = ensure_project(GL, REQUEST)
    assert (result.outcome, result.message) == (ProjectOutcome.FAILED, "quota reached")
    calls.clone.push.assert_not_called()


def test_a_failed_push_says_whose_token_and_how_to_finish():
    """The message says the push ran with the user's own token, why GitLab
    may refuse it, and that the new project stays empty until it is deleted
    and the user named again (a re-run never fills a project it finds)."""
    with _gitlab(MISSING, pushed="Could not push to y."):
        result = ensure_project(GL, REQUEST)
    assert result.outcome is ProjectOutcome.FAILED
    assert result.message.splitlines() == [
        "Could not push to y.",
        "The push uses alice's own GitLab token. If GitLab refused it, alice "
        "may first have to sign in and set a new password, or the token was "
        "revoked.",
        "The project is left empty: delete it, then run 'dtaas user add alice' again.",
    ]


@pytest.mark.parametrize(
    "lookup,outcome",
    [
        (ProjectLookup(ProjectState.EMPTY, path=GITLAB_PATH), ProjectOutcome.EMPTY),
        (
            ProjectLookup(ProjectState.HAS_CONTENT, path=GITLAB_PATH),
            ProjectOutcome.HAS_CONTENT,
        ),
        (ProjectLookup(ProjectState.FAILED, "lookup failed"), ProjectOutcome.FAILED),
    ],
    ids=["empty", "content", "lookup-failed"],
)
def test_a_project_found_is_never_touched(lookup, outcome):
    """A project already there, even an empty one, is reported and never
    cloned into, created or pushed to (so no token is checked for it): its
    settings are its owner's. A failed lookup does nothing either."""
    with _gitlab(lookup) as calls:
        result = ensure_project(GL, REQUEST)
    assert (result.outcome, result.message) == (outcome, lookup.error)
    calls.checked.assert_not_called()
    calls.cloned.assert_not_called()
    calls.create.assert_not_called()
