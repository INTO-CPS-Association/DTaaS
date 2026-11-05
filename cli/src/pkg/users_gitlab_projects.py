"""The project step of GitLab provisioning for 'user add'.

Runs after the account step of users_gitlab.py, for the users whose account
and token are in place, from this run or an earlier one. Each gets the
private projects named in [gitlab] (common_template, user_template) in their
own namespace, filled from those templates by pkg/gitlab. A project failure
fails that user alone: their containers and account stay, and the other
users are still attempted. Each finished project is recorded in the registry
(gitlab_projects) at once, so a re-run never recreates or re-pushes it.
"""

from dataclasses import dataclass

from . import gitlab as gitlabPkg
from .messages import echo_hint
from .registry import set_gitlab_projects

HAS_CONTENT_DETAIL = "It was left as it is: no template was pushed into it."

_DONE_SUMMARY = {
    gitlabPkg.ProjectOutcome.CREATED: "GitLab project '{path}' created.",
    gitlabPkg.ProjectOutcome.FILLED: "GitLab project '{path}' filled.",
}


@dataclass(frozen=True)
class GitlabRun:
    """One run's admin client and its templates ({project name: URL}, empty
    for accounts and tokens only)."""

    gl: object
    templates: dict


@dataclass(frozen=True)
class _Target:
    """A user whose account is ready, and the projects already finished."""

    username: str
    user_id: int
    done: tuple


def _account_ready(candidate, result):
    """True once the candidate's account and token are in place, from this
    run (*result*, the account step's) or an earlier one."""
    if result is None or result.failed:
        return False
    return bool(result.token or candidate.pat_issued)


def _pending(candidate, templates):
    """True when *candidate* lacks one of the template projects."""
    return any(name not in candidate.projects for name in templates)


def has_project_work(candidate, templates):
    """True when an account from an earlier run still lacks a project: the
    work a run has for a user whose account step has nothing left to do."""
    return candidate.pat_issued and _pending(candidate, templates)


def _target(candidate, result, templates):
    """*candidate* as a _Target when its account is ready and a project is
    still to make, else None."""
    if not _account_ready(candidate, result) or not _pending(candidate, templates):
        return None
    user_id = result.new_id or candidate.existing_user_id
    return _Target(candidate.username, user_id, candidate.projects)


def _targets(run, candidates, results):
    """The candidates with a ready account and a project still to make."""
    by_name = {result.username: result for result in results}
    found = (_target(c, by_name.get(c.username), run.templates) for c in candidates)
    return [target for target in found if target is not None]


def _record(request, result, done):
    """Record a filled project in the registry; True once it is saved."""
    done.append(request.name)
    try:
        set_gitlab_projects({request.username: list(done)})
    except (OSError, ValueError) as exc:
        echo_hint(
            f"GitLab project '{request.path}' not recorded.",
            f"{exc}\nIt was filled, but a re-run will warn that it has content.",
        )
        return False
    summary = _DONE_SUMMARY[result.outcome].format(path=request.path)
    echo_hint(summary, f"Private, filled from {request.template_url}")
    return True


def _report(request, result, done):
    """Echo one project's outcome; True unless it failed."""
    if result.outcome is gitlabPkg.ProjectOutcome.FAILED:
        echo_hint(f"GitLab project '{request.path}' failed.", result.message)
        return False
    if result.outcome is gitlabPkg.ProjectOutcome.HAS_CONTENT:
        echo_hint(
            f"Warning: GitLab project '{request.path}' has content.",
            HAS_CONTENT_DETAIL,
        )
        return True
    return _record(request, result, done)


def _one_project(gl, request, done):
    """Provision one project; True unless it failed.

    A failure the API layer did not expect is this project's alone, as in
    the account step, so it never ends the run for later users.
    """
    try:
        result = gitlabPkg.ensure_project(gl, request)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        result = gitlabPkg.ProjectResult(gitlabPkg.ProjectOutcome.FAILED, str(exc))
    return _report(request, result, done)


def _user_projects(run, target):
    """Provision *target*'s missing projects; True when none failed.

    Every project is attempted: a failed one never stops the next.
    """
    done = list(target.done)
    succeeded = True
    for name, url in run.templates.items():
        if name not in target.done:
            request = gitlabPkg.ProjectRequest(
                target.user_id, target.username, name, url
            )
            succeeded = _one_project(run.gl, request, done) and succeeded
    return succeeded


def provision_projects(run, candidates, results):
    """Give each ready candidate the projects of *run*'s templates.

    *results* are the account step's GitlabUserResults. git is checked once,
    before any project is touched: without it, every user who needed a
    project fails, and their accounts stay.

    Returns:
        The usernames whose project step failed.
    """
    targets = _targets(run, candidates, results)
    problem = gitlabPkg.git_problem() if targets else ""
    if problem:
        echo_hint("GitLab projects skipped for every user.", problem)
        return [target.username for target in targets]
    return [target.username for target in targets if not _user_projects(run, target)]
