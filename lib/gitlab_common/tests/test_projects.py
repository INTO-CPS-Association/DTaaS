"""Tests for one user's GitLab project creation (gitlab_common/projects.py)."""

from types import SimpleNamespace
from unittest.mock import MagicMock, Mock

import pytest
import requests
from gitlab.exceptions import GitlabCreateError, GitlabGetError
from gitlab_common import project_import
from gitlab_common.project_import import IMPORT_RETRY_HINT
from gitlab_common.projects import NO_IMPORT_TO_AWAIT, ProjectSpec, create_user_project

PROJECT_ID = 42
USER_ID = 7
NAMESPACE = "alice"
TEMPLATE_URL = "https://gitlab.com/dtaas/user1.git"
TEMPLATE_BRANCHES = ("main", "feature-a", "feature-b")

SPEC = ProjectSpec("user", TEMPLATE_URL)


def _project(import_status="finished", branches=TEMPLATE_BRANCHES):
    """A project mock whose repository holds *branches*, as a fresh import
    leaves it: no default branch of its own yet."""
    project = MagicMock()
    project.id = PROJECT_ID
    project.import_status = import_status
    project.empty_repo = False
    project.default_branch = None
    project.branches.list.return_value = [SimpleNamespace(name=n) for n in branches]
    return project


def _owned(default_branch="main", empty_repo=False):
    """A project mock as it is found in the namespace on a later run: imported
    by default, or left behind unimported by a run that failed."""
    project = _project()
    project.default_branch = default_branch
    project.empty_repo = empty_repo
    return project


def _client(project=None, existing=False):
    """A client mock. With *existing*, the user already owns the project;
    otherwise the namespace lookup misses and creation returns *project*."""
    gl = MagicMock()
    project = project if project is not None else _project()
    user = Mock()
    user.username = NAMESPACE
    user.projects.create.return_value = SimpleNamespace(id=PROJECT_ID)
    gl.users.get.return_value = user

    def _get(ref, **_kwargs):
        if isinstance(ref, str) and not existing:
            raise GitlabGetError("404 Project Not Found", response_code=404)
        return project

    gl.projects.get.side_effect = _get
    return gl, user, project


def test_create_user_project_creates_a_private_import():
    """The project is created in the user's namespace from the template URL."""
    gl, user, _ = _client()
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is True
    assert result.project_id == PROJECT_ID
    assert user.projects.create.call_args.args[0] == {
        "name": "user",
        "import_url": TEMPLATE_URL,
        "visibility": "private",
    }


def test_create_user_project_keeps_the_template_as_it_stands():
    """One template repository per project, so the import is the whole answer:
    every branch it brought across stays, and the default branch it came with
    is left alone."""
    gl, _, project = _client()
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is True
    project.branches.delete.assert_not_called()
    project.protectedbranches.delete.assert_not_called()
    project.save.assert_not_called()


def test_create_user_project_imported_project_is_untouched():
    """A project already imported from the template is reported, never
    re-imported, so a repeated run keeps the user's work."""
    gl, user, project = _client(project=_owned(), existing=True)
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.already_exists is True
    assert result.ok is True
    assert result.project_id == PROJECT_ID
    user.projects.create.assert_not_called()
    project.branches.delete.assert_not_called()


def test_create_user_project_never_touches_a_project_with_content():
    """A project with content may hold the user's own work, whatever its
    branches look like, so it is reported and left exactly as it is."""
    project = _owned(default_branch="my-work")
    gl, _, _ = _client(project=project, existing=True)
    result = create_user_project(gl, USER_ID, SPEC)
    assert (result.ok, result.already_exists) == (True, True)
    assert project.default_branch == "my-work"
    project.save.assert_not_called()
    project.branches.delete.assert_not_called()


def test_create_user_project_resumes_an_empty_project_from_a_failed_run():
    """A run that created the project and then stopped waiting on its import
    leaves an empty repository behind. Reporting that as ready would mark the
    user done with nothing in it, so the wait is finished instead."""
    gl, user, _ = _client(
        project=_owned(default_branch=None, empty_repo=True), existing=True
    )
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is True
    assert result.already_exists is False
    user.projects.create.assert_not_called()


def test_create_user_project_names_the_retry_for_a_dead_import():
    """GitLab never reruns a failed import, so an empty project left by one
    fails on every run; the error says how to get past it."""
    project = _owned(default_branch=None, empty_repo=True)
    project.import_status = "failed"
    gl, _, _ = _client(project=project, existing=True)
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is False
    assert IMPORT_RETRY_HINT in result.error


def test_create_user_project_reports_an_empty_project_of_nobodys_making():
    """An empty project that was never imported from anywhere (a user made it
    themselves) is not an import this run can wait on, so it is reported as
    what it is rather than as a disabled import source on the instance."""
    project = _owned(default_branch=None, empty_repo=True)
    project.import_status = "none"
    gl, _, _ = _client(project=project, existing=True)
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is False
    assert result.error == NO_IMPORT_TO_AWAIT
    assert "Repository by URL" not in result.error


@pytest.mark.parametrize(
    "failure",
    [
        requests.ConnectionError("connection reset"),
        GitlabCreateError("500 Internal Server Error", response_code=500),
    ],
)
def test_create_user_project_reports_a_dropped_connection(failure):
    """A network failure while creating is this project's error, not an
    exception: the caller's remaining users are still provisioned."""
    gl, user, _ = _client()
    user.projects.create.side_effect = failure
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is False
    assert "could not create project 'user'" in result.error


def test_create_user_project_waits_only_as_long_as_the_spec_allows(monkeypatch):
    """The budget on the spec is the one the import wait uses, so an operator
    who caps it is not held for the default ten minutes per project."""
    monkeypatch.setattr(project_import, "IMPORT_POLL_SECONDS", 60)
    gl, _, _ = _client(project=_project(import_status="started"))
    spec = ProjectSpec("user", TEMPLATE_URL, import_timeout=2)
    result = create_user_project(gl, USER_ID, spec)
    assert result.ok is False
    assert "timed out" in result.error
    polls = gl.projects.get.call_count - 1  # the first read is the namespace lookup
    assert polls == 2


def test_create_user_project_reports_an_unscheduled_import():
    """An import GitLab never started fails, naming the import source, so the
    instance setting that blocks it is the first thing an admin reads."""
    gl, _, _ = _client(project=_project(import_status="none"))
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is False
    assert "Repository by URL" in result.error


def test_create_user_project_reports_a_create_failure():
    """A GitLab error while creating is FAILED, with no import awaited."""
    gl, user, _ = _client()
    user.projects.create.side_effect = GitlabCreateError(
        "403 Forbidden", response_code=403
    )
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is False
    assert "could not create project 'user'" in result.error


def test_create_user_project_reports_a_failed_import():
    """A failed import is reported with GitLab's own detail, not as success."""
    project = _project(import_status="failed")
    project.import_error = "could not reach the template URL"
    gl, _, _ = _client(project=project)
    result = create_user_project(gl, USER_ID, SPEC)
    assert result.ok is False
    assert "could not reach the template URL" in result.error
    assert result.project_id == PROJECT_ID


def test_a_lookup_refusal_is_not_read_as_an_absent_project():
    """Only a 404 means the project is not there. A 403 from a token that may
    not read the namespace used to read as "absent", which sent the run on to
    create a project that may well exist and reported the permission problem
    as whatever the creation then answered."""
    gl, user, _ = _client()
    gl.projects.get.side_effect = GitlabGetError("403 Forbidden", response_code=403)

    result = create_user_project(gl, USER_ID, SPEC)

    assert result.ok is False
    assert "could not look up project 'user'" in result.error
    user.projects.create.assert_not_called()


def test_a_lookup_failure_names_the_lookup_not_the_creation():
    """An unreachable instance during the namespace read is reported as the
    read it was, so an admin is not sent looking at project creation rights."""
    gl, user, _ = _client()
    gl.users.get.side_effect = requests.ConnectionError("connection reset")

    result = create_user_project(gl, USER_ID, SPEC)

    assert result.ok is False
    assert "could not look up project 'user'" in result.error
    user.projects.create.assert_not_called()
