"""Provisions one user's projects one after another, and says and records
what happened to each, the same way for every consumer.

ensure_projects calls ensure_project for each request, so every project is
attempted: a failure, even one the API layer did not expect, is that
project's alone and never stops the next. Each outcome becomes a
ProjectNotice (a line with its detail below it) for the consumer to print,
and a finished project is handed to the consumer to save:

* created: saved, then announced with the template it was filled from.
* found with content: a warning, then saved, since nothing is left to do
  for it, so a re-run stays quiet about it.
* found empty: a warning only. It is never saved, so every run that
  reaches it warns until the admin deletes it.
* failed: the failure, nothing saved.

A project whose record cannot be saved counts as failed, with what the
next run does about it. How a notice is printed and where a project is
recorded is each consumer's: they pass both through ProjectHooks.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Callable

from .project_fill import ProjectOutcome, ProjectRequest, ProjectResult, ensure_project

# A project found in place: (end of the warning line, its detail).
_FOUND_WARNINGS = {
    ProjectOutcome.HAS_CONTENT: (
        "has content",
        "It was left as it is: no template was pushed into it.",
    ),
    ProjectOutcome.EMPTY: (
        "exists but is empty",
        "It was not created by this run, so no template was pushed into it. "
        "Delete it, then run '{rerun}' again.",
    ),
}


class NoticeLevel(Enum):
    """How a ProjectNotice reads: a success, a warning or an error."""

    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


@dataclass(frozen=True)
class ProjectNotice:
    """One line about a project, and the detail printed below it."""

    level: NoticeLevel
    headline: str
    detail: str = ""


@dataclass(frozen=True)
class ProjectHooks:
    """A consumer's two halves of ensure_projects: *show* prints one
    notice, *save* records the project of a request as finished for its
    owner and returns "" or why it could not."""

    show: Callable[[ProjectNotice], None]
    save: Callable[[ProjectRequest], str]


def _attempt(gl, request) -> ProjectResult:
    """ensure_project's result for *request*. A failure the API layer did
    not expect is this project's alone."""
    try:
        return ensure_project(gl, request)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        return ProjectResult(ProjectOutcome.FAILED, str(exc))


def _saved(request, hooks) -> bool:
    """Save *request*'s project as finished: True once saved, else say what
    the next run does about it."""
    error = hooks.save(request)
    if error:
        hooks.show(
            ProjectNotice(
                NoticeLevel.ERROR,
                f"GitLab project '{request.path}' not recorded.",
                f"{error}\nThe next run that reaches it warns that it has "
                "content, then records it.",
            )
        )
    return not error


def _created(request, hooks) -> ProjectOutcome:
    """Save a created project, then announce it: CREATED, or FAILED when
    it could not be saved."""
    if not _saved(request, hooks):
        return ProjectOutcome.FAILED
    pinned = f" at commit {request.template_commit}" if request.template_commit else ""
    hooks.show(
        ProjectNotice(
            NoticeLevel.SUCCESS,
            f"GitLab project '{request.path}' created.",
            f"Private, filled from {request.template_url}{pinned}",
        )
    )
    return ProjectOutcome.CREATED


def _found(request, outcome, hooks) -> ProjectOutcome:
    """Warn about a project found in place, which is not a failure, and save
    one with content: *outcome*, or FAILED when it could not be saved."""
    ending, detail = _FOUND_WARNINGS[outcome]
    hooks.show(
        ProjectNotice(
            NoticeLevel.WARNING,
            f"Warning: GitLab project '{request.path}' {ending}.",
            detail.format(rerun=request.rerun),
        )
    )
    recorded = outcome is ProjectOutcome.EMPTY or _saved(request, hooks)
    return outcome if recorded else ProjectOutcome.FAILED


def _finish(request, result, hooks) -> ProjectOutcome:
    """Show and save *request*'s *result*: its outcome, or FAILED when a
    project to save could not be saved."""
    if result.outcome is ProjectOutcome.FAILED:
        hooks.show(
            ProjectNotice(
                NoticeLevel.ERROR,
                f"GitLab project '{request.path}' failed.",
                result.message,
            )
        )
        return result.outcome
    if result.outcome in _FOUND_WARNINGS:
        return _found(request, result.outcome, hooks)
    return _created(request, hooks)


def ensure_projects(gl, requests, hooks) -> list[ProjectOutcome]:
    """Provision each of *requests* (one user's ProjectRequests), in order,
    showing each outcome and saving each finished project through *hooks*.

    Args:
        gl: The admin gitlab.Gitlab client, for ensure_project.
        requests: The ProjectRequests of one user's missing projects.
        hooks: The consumer's ProjectHooks.

    Returns:
        Each request's outcome, in order: FAILED also for a project whose
        record could not be saved.
    """
    outcomes = []
    for request in requests:
        # Every project is attempted: a failure never stops the next.
        outcomes.append(_finish(request, _attempt(gl, request), hooks))
    return outcomes
