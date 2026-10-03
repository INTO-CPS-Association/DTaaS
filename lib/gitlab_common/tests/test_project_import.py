"""Tests for the repository import wait (gitlab_common/project_import.py)."""

from unittest.mock import MagicMock

import pytest
import requests
from gitlab.exceptions import GitlabGetError
from gitlab_common import project_import
from gitlab_common.project_import import (
    IMPORT_NOT_SCHEDULED,
    IMPORT_POLL_MAX_ERRORS,
    IMPORT_RETRY_HINT,
    await_import,
    import_state,
)

PROJECT_ID = 42


def _project(import_status, import_error=""):
    """A project mock reporting *import_status*."""
    project = MagicMock()
    project.id = PROJECT_ID
    project.import_status = import_status
    project.import_error = import_error
    return project


@pytest.mark.parametrize(
    "status,expected",
    [("finished", ""), ("scheduled", None), ("started", None)],
)
def test_import_state_reads_the_status(status, expected):
    """A finished import is ready, a running one is neither ready nor failed."""
    assert import_state(_project(status)) == expected


def test_import_state_reports_a_failed_import_with_gitlabs_detail():
    """GitLab's own reason is what an admin needs, so it is passed through,
    with the way to retry: GitLab never reruns a failed import itself."""
    state = import_state(_project("failed", "could not reach the template URL"))
    assert "could not reach the template URL" in state
    assert IMPORT_RETRY_HINT in state


def test_import_state_reports_a_failed_import_without_detail():
    """A failure GitLab gives no reason for still reads as a failure."""
    assert "no detail reported" in import_state(_project("failed"))


def test_import_state_treats_an_unscheduled_import_as_an_error():
    """Every project polled here was created with an import_url, so status
    'none' means the import never started, the usual cause being a disabled
    import source. Reporting it as ready would hand the user an empty
    repository and name no cause at all."""
    assert import_state(_project("none")) == IMPORT_NOT_SCHEDULED
    assert "Repository by URL" in IMPORT_NOT_SCHEDULED
    assert IMPORT_RETRY_HINT in IMPORT_NOT_SCHEDULED


def test_await_import_polls_until_the_import_finishes():
    """The status only changes server side, so the project is re fetched."""
    gl = MagicMock()
    statuses = iter(["started", "started", "finished"])
    gl.projects.get.side_effect = lambda _id: _project(next(statuses))
    project, error = await_import(gl, PROJECT_ID)
    assert error == ""
    assert project.import_status == "finished"
    assert gl.projects.get.call_count == 3


def test_await_import_gives_up_when_the_budget_runs_out(monkeypatch):
    """An import that never finishes fails instead of hanging forever, after
    as many polls as the caller's budget in minutes allows."""
    monkeypatch.setattr(project_import, "IMPORT_POLL_SECONDS", 60)
    gl = MagicMock()
    gl.projects.get.return_value = _project("started")
    _project_obj, error = await_import(gl, PROJECT_ID, timeout_minutes=2)
    assert "timed out" in error
    assert gl.projects.get.call_count == 2


def test_await_import_polls_at_least_once(monkeypatch):
    """A budget smaller than one interval still reads the status once, so a
    finished import is never missed for want of time."""
    monkeypatch.setattr(project_import, "IMPORT_POLL_SECONDS", 60)
    gl = MagicMock()
    gl.projects.get.return_value = _project("finished")
    assert await_import(gl, PROJECT_ID, timeout_minutes=0)[1] == ""


def _reads(*outcomes):
    """A client whose project reads yield *outcomes* in turn, raising the
    exceptions among them."""
    gl = MagicMock()
    gl.projects.get.side_effect = list(outcomes)
    return gl


@pytest.mark.parametrize(
    "failure",
    [
        GitlabGetError("500 Internal Server Error", response_code=500),
        requests.ConnectionError("connection reset"),
    ],
)
def test_await_import_rides_out_a_transient_error(failure):
    """One failed read in a long wait, a GitLab error or a dropped
    connection, is retried rather than failing the user."""
    gl = _reads(_project("started"), failure, _project("finished"))
    project, error = await_import(gl, PROJECT_ID)
    assert error == ""
    assert project.import_status == "finished"


def test_await_import_resets_the_error_count_on_a_good_read():
    """Only errors in a row end the wait, so scattered ones never add up."""
    failure = requests.Timeout("read timed out")
    burst = [failure] * (IMPORT_POLL_MAX_ERRORS - 1)
    gl = _reads(*burst, _project("started"), *burst, _project("finished"))
    assert await_import(gl, PROJECT_ID)[1] == ""


def test_await_import_gives_up_on_an_unreachable_gitlab():
    """Errors in a row end the wait as this project's error, never as an
    exception that would abort the caller's remaining users."""
    failure = GitlabGetError("503 Service Unavailable", response_code=503)
    gl = _reads(*[failure] * IMPORT_POLL_MAX_ERRORS)
    project, error = await_import(gl, PROJECT_ID)
    assert project is None
    assert f"{IMPORT_POLL_MAX_ERRORS} times in a row" in error
    assert "503" in error
