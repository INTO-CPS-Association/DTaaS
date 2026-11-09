"""The project step of GitLab provisioning for 'user add'.

Runs after the account step of users_gitlab.py, for the users whose account
and token are in place, from this run or an earlier one. Each gets the
private projects 'common' and 'user' in their own namespace, filled by
pkg/gitlab from the templates of [gitlab].template_group on template_host,
and pushed as the user with their own token: the one this run issued, or
the one an earlier run saved in the token file.
A project failure fails that user alone: their containers and account stay,
and the other users are still attempted. Each finished project is recorded
in the registry (gitlab_projects) at once, so a re-run never recreates or
re-pushes it. A project that already exists is never filled, only warned
about: one with content is then recorded too, since nothing is left to do
for it, so the warning shows once; an empty one is not, so every run that
reaches it warns until the admin deletes it.
"""

from dataclasses import dataclass, field

from . import gitlab as gitlabPkg
from .constants import GITLAB_USER_TOKENS_FILE
from .messages import echo_hint
from .registry import set_gitlab_projects
from .users_gitlab_records import load_saved_tokens

# A project found in place: (end of the warning line, its detail).
_FOUND_WARNINGS = {
    gitlabPkg.ProjectOutcome.HAS_CONTENT: (
        "has content",
        "It was left as it is: no template was pushed into it.",
    ),
    gitlabPkg.ProjectOutcome.EMPTY: (
        "exists but is empty",
        "It was not created by this run, so no template was pushed into it. "
        "Delete it, then run 'dtaas user add {username}' again.",
    ),
}


@dataclass(frozen=True)
class GitlabRun:
    """One run's admin client and its templates ({project name: URL}, empty
    for accounts and tokens only)."""

    gl: object
    templates: dict


@dataclass(frozen=True)
class _Target:
    """A user whose account is ready, the projects already finished, and
    the token this run issued them ("" when an earlier run did)."""

    username: str
    user_id: int
    done: tuple
    token: str = field(default="", repr=False)


@dataclass(frozen=True)
class _SavedTokens:
    """The tokens in the token file, and why it could not be read, if so."""

    tokens: dict
    error: str = ""


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
    return _Target(candidate.username, user_id, candidate.projects, result.token or "")


def _targets(run, candidates, results):
    """The candidates with a ready account and a project still to make."""
    by_name = {result.username: result for result in results}
    found = (_target(c, by_name.get(c.username), run.templates) for c in candidates)
    return [target for target in found if target is not None]


def _record(request, done):
    """Add *request*'s project to the registry's gitlab_projects; True once
    it is saved."""
    done.append(request.name)
    try:
        set_gitlab_projects({request.username: list(done)})
    except (OSError, ValueError) as exc:
        echo_hint(
            f"GitLab project '{request.path}' not recorded.",
            f"{exc}\nThe next run that reaches it warns that it has content, "
            "then records it.",
        )
        return False
    return True


def _created(request, done):
    """Record a created project, then say so; True once it is saved."""
    if not _record(request, done):
        return False
    echo_hint(
        f"GitLab project '{request.path}' created.",
        f"Private, filled from {request.template_url}",
    )
    return True


def _warn_found(request, result, done):
    """Warn about a project found in place, which is not a failure. One with
    content is recorded as well; True unless that record fails."""
    ending, detail = _FOUND_WARNINGS[result.outcome]
    echo_hint(
        f"Warning: GitLab project '{request.path}' {ending}.",
        detail.format(username=request.username),
    )
    if result.outcome is gitlabPkg.ProjectOutcome.HAS_CONTENT:
        return _record(request, done)
    return True


def _report(request, result, done):
    """Echo one project's outcome; True unless it failed."""
    if result.outcome is gitlabPkg.ProjectOutcome.FAILED:
        echo_hint(f"GitLab project '{request.path}' failed.", result.message)
        return False
    if result.outcome in _FOUND_WARNINGS:
        return _warn_found(request, result, done)
    return _created(request, done)


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


def _make_projects(run, target, token):
    """Provision *target*'s missing projects, pushing with *token*; True
    when none failed. Every project is attempted: a failed one never stops
    the next."""
    done = list(target.done)
    succeeded = True
    for name, url in run.templates.items():
        if name not in target.done:
            rerun = f"dtaas user add {target.username}"
            request = gitlabPkg.ProjectRequest(
                target.user_id, target.username, name, url, rerun, token
            )
            succeeded = _one_project(run.gl, request, done) and succeeded
    return succeeded


def _saved_tokens():
    """The token file's tokens, read once per run for users whose token an
    earlier run issued."""
    try:
        return _SavedTokens(load_saved_tokens())
    except (OSError, ValueError) as exc:
        return _SavedTokens({}, f"{GITLAB_USER_TOKENS_FILE} cannot be read: {exc}\n")


def _user_projects(run, target, saved):
    """Provision *target*'s missing projects as the user, with the token
    this run issued them or the one saved for them; True when none failed.
    Without a token, no project is attempted and the user fails."""
    token = target.token or saved.tokens.get(target.username, "")
    if token:
        return _make_projects(run, target, token)
    echo_hint(
        f"GitLab projects for '{target.username}' skipped.",
        f"{saved.error}The push uses the user's own token, and none is saved "
        f"for '{target.username}' in {GITLAB_USER_TOKENS_FILE}. Put it back, "
        f"then run 'dtaas user add {target.username}' again.",
    )
    return False


def provision_projects(run, candidates, results):
    """Give each ready candidate the projects of *run*'s templates.

    *results* are the account step's GitlabUserResults. git is checked once,
    before any project is touched: without it, every user who needed a
    project fails, and their accounts stay. The token file is read once,
    for the users whose token an earlier run issued.

    Returns:
        The usernames whose project step failed.
    """
    targets = _targets(run, candidates, results)
    problem = gitlabPkg.git_problem() if targets else ""
    if problem:
        echo_hint("GitLab projects skipped for every user.", problem)
        return [target.username for target in targets]
    needs_file = any(not target.token for target in targets)
    saved = _saved_tokens() if needs_file else _SavedTokens({})
    return [t.username for t in targets if not _user_projects(run, t, saved)]
