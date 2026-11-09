"""The project step of 'dtaas-services user add -s gitlab'.

Runs after the account step of users.py when config/services.env names the
templates (project_templates.py). Each user whose account is in place gets
the private projects 'common' and 'user' in their own namespace, created and
filled by gitlab_common.ensure_project and pushed as the user with their own
token: the one this run issued, or the one saved for them in
config/gitlab_user_tokens.json. An account that existed before this run is
found by username, and only with a saved token, the sign that this CLI made
it: without one, no project is attempted and the user fails.

A project failure fails that user alone: the account stays, and the other
users are still attempted. A project recorded as finished (project_state.py)
is skipped without asking GitLab. How each outcome is reported and recorded
is project_report.py's.
"""

from dataclasses import dataclass, field
from pathlib import Path

import gitlab

from ....gitlab_common import (
    ProjectOutcome,
    ProjectRequest,
    ProjectResult,
    ensure_project,
    find_user_id,
    git_problem,
)
from .project_report import RERUN, ProjectTally, UserProgress, report, say
from .project_state import read_finished
from .tokens_file import USER_TOKENS_FILENAME, read_saved_tokens


@dataclass(frozen=True)
class Account:
    """A user whose GitLab account is in place after the account step: its
    id and token when this run created it, None and "" when it existed."""

    username: str
    user_id: int | None = None
    token: str = field(default="", repr=False)


@dataclass(frozen=True)
class ProjectRun:
    """One run's admin client, its templates ({project name: URL}, empty for
    accounts and tokens only) and the user token file."""

    gl: gitlab.Gitlab
    templates: dict[str, str]
    tokens_path: Path


@dataclass
class _Context:
    """The run, the finished projects, the saved tokens and the tally."""

    run: ProjectRun
    finished: dict[str, list[str]]
    tally: ProjectTally
    saved: dict = field(default_factory=dict, repr=False)
    saved_error: str = ""


def _one_project(
    gl: gitlab.Gitlab, request: ProjectRequest, progress: UserProgress
) -> bool:
    """Provision one project and report it: True unless it failed. A failure
    the API layer did not expect is this project's alone."""
    try:
        result = ensure_project(gl, request)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        result = ProjectResult(ProjectOutcome.FAILED, str(exc))
    return report(request, result, progress)


def _make_projects(context: _Context, user: tuple[str, int], token: str) -> bool:
    """Provision the missing projects of *user* (username, GitLab id),
    pushing with *token*: True when none failed. Every project is
    attempted: a failed one never stops the next."""
    username, user_id = user
    progress = UserProgress(list(context.finished.get(username, [])), context.tally)
    missing = [
        item for item in context.run.templates.items() if item[0] not in progress.done
    ]
    succeeded = True
    for name, url in missing:
        request = ProjectRequest(user_id, username, name, url, RERUN, token)
        # The call comes first, so a failure never skips the next project.
        succeeded = _one_project(context.run.gl, request, progress) and succeeded
    return succeeded


def _token(context: _Context, account: Account) -> str:
    """The token this run issued *account*, else the one saved for them."""
    saved = context.saved.get(account.username, "")
    return account.token or (saved if isinstance(saved, str) else "")


def _user_id(context: _Context, account: Account) -> tuple[int | None, str]:
    """*account*'s GitLab id: this run's, else looked up by username."""
    if account.user_id is not None:
        return account.user_id, ""
    return find_user_id(context.run.gl, account.username)


def _user_projects(context: _Context, account: Account) -> bool:
    """Provision *account*'s missing projects as the user: True when none
    failed. Without a token, no project is attempted and the user fails."""
    token = _token(context, account)
    if not token:
        say(
            "red",
            f"GitLab projects for '{account.username}' skipped.",
            f"{context.saved_error}The push uses the user's own token, and none "
            f"is saved for '{account.username}' in config/{USER_TOKENS_FILENAME}. "
            "Save a token of theirs with the write_repository scope there, then "
            f"run '{RERUN}' again.",
        )
        return False
    user_id, error = _user_id(context, account)
    if user_id is None:
        say("red", f"GitLab projects for '{account.username}' failed.", error)
        return False
    return _make_projects(context, (account.username, user_id), token)


def _pending(context: _Context, account: Account) -> bool:
    """True when *account* lacks one of the template projects."""
    done = context.finished.get(account.username, [])
    return any(name not in done for name in context.run.templates)


def _provision(context: _Context, accounts: list[Account]) -> None:
    """Give each account with a missing project its projects, tallied in
    *context*. git is checked once, before any project is touched."""
    targets = [account for account in accounts if _pending(context, account)]
    problem = git_problem() if targets else ""
    if problem:
        say("red", "GitLab projects skipped for every user.", problem)
        context.tally.failed.extend(account.username for account in targets)
        return
    context.saved, error = read_saved_tokens(context.run.tokens_path)
    context.saved_error = f"{error}\n" if error else ""
    failed = [a.username for a in targets if not _user_projects(context, a)]
    context.tally.failed.extend(failed)


def provision_projects(run: ProjectRun, accounts: list[Account]) -> ProjectTally:
    """Give each account the projects of *run*'s templates, printing a line
    for each project as it is handled.

    Nothing happens when *run* has no templates. A finished projects file
    that cannot be read fails every account, and no project is touched.
    """
    tally = ProjectTally()
    if not run.templates or not accounts:
        return tally
    finished, error = read_finished()
    if error:
        say("red", "GitLab projects skipped for every user.", error)
        tally.failed.extend(account.username for account in accounts)
        return tally
    _provision(_Context(run, finished, tally), accounts)
    return tally
