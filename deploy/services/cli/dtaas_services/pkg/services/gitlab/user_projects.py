"""The project step of 'dtaas-services user add -s gitlab'.

Runs after the account step (accounts.py) when config/services.env names the
templates (project_templates.py). Each user whose account is in place gets
the private projects 'common' and 'user' in their own namespace, created and
filled by gitlab_common.ensure_project and pushed as the user with their own
token: the one this run issued, or the one saved for them in
config/gitlab_user_tokens.json. ensure_project first checks that the token
pushes as that very account, so a token GitLab refuses, or one of another
account, creates nothing. Without a token, no project is attempted and the
user fails.

A user's finished projects are those of their record in
config/gitlab_user_projects.json (project_state.py), and only when the
record belongs to their account. Every account comes with its id and
creation time from the account step, which looks an account that existed
before the run up by username, once. A record of another account (GitLab
reinstalled, or the user deleted and added again) counts as none, so the
account gets its projects.

A project failure fails that user alone: the account stays, and the other
users are still attempted. The loop over a user's projects, the wording of
each outcome and which outcomes are recorded are gitlab_common's
(ensure_projects), shared with the DTaaS CLI. How a line is printed and
where a project is recorded is project_report.py's.
"""

from dataclasses import dataclass, field
from pathlib import Path

import gitlab

from ....gitlab_common import (
    ProjectHooks,
    ProjectOutcome,
    ProjectRequest,
    ensure_projects,
    git_problem,
)
from .project_report import RERUN, ProjectTally, UserProgress, say, show
from .project_state import UserRecord, read_records
from .project_templates import ProjectTemplate
from .tokens_file import USER_TOKENS_FILENAME, read_saved_tokens


@dataclass(frozen=True)
class Account:
    """A user whose GitLab account is in place after the account step: its
    id and creation time, and the token this run issued it ("" when it
    keeps the one saved for it)."""

    username: str
    user_id: int
    token: str = field(default="", repr=False)
    created_at: str = ""


@dataclass(frozen=True)
class ProjectRun:
    """One run's admin client, its templates ({project name:
    ProjectTemplate}, empty for accounts and tokens only) and the user token
    file."""

    gl: gitlab.Gitlab
    templates: dict[str, ProjectTemplate]
    tokens_path: Path


@dataclass
class _Context:
    """The run, the records, the saved tokens and the tally."""

    run: ProjectRun
    records: dict[str, UserRecord]
    tally: ProjectTally
    saved: dict = field(default_factory=dict, repr=False)
    saved_error: str = ""


@dataclass(frozen=True)
class _Target:
    """An account with a project still to make, and its record: the
    account's id and creation time, and the projects finished in it."""

    account: Account
    record: UserRecord


def _make_projects(context: _Context, target: _Target, token: str) -> bool:
    """Provision the missing projects of *target*, pushing with *token*:
    True when none failed. Every project is attempted: a failed one never
    stops the next."""
    username, user_id = target.account.username, target.record.user_id
    requests = [
        ProjectRequest(
            user_id, username, name, template.url, RERUN, token, template.commit
        )
        for name, template in context.run.templates.items()
        if name not in target.record.projects
    ]
    hooks = ProjectHooks(show, UserProgress(target.record).save)
    outcomes = ensure_projects(context.run.gl, requests, hooks)
    context.tally.created += outcomes.count(ProjectOutcome.CREATED)
    return ProjectOutcome.FAILED not in outcomes


def _token(context: _Context, account: Account) -> str:
    """The token this run issued *account*, else the one saved for them."""
    saved = context.saved.get(account.username, "")
    return account.token or (saved if isinstance(saved, str) else "")


def _user_projects(context: _Context, target: _Target) -> bool:
    """Provision *target*'s missing projects as the user: True when none
    failed. Without a token, no project is attempted and the user fails."""
    token = _token(context, target.account)
    if token:
        return _make_projects(context, target, token)
    username = target.account.username
    say(
        "red",
        f"GitLab projects for '{username}' skipped.",
        f"{context.saved_error}The push uses the user's own token, and none "
        f"is saved for '{username}' in config/{USER_TOKENS_FILENAME}. Save a "
        "token of theirs with the write_repository scope there, then run "
        f"'{RERUN}' again.",
    )
    return False


def _record_of(context: _Context, account: Account) -> UserRecord:
    """*account*'s record when it belongs to that account, else an empty one
    for it: a record of another account counts as none."""
    record = context.records.get(account.username)
    if record is not None and record.belongs_to(account.user_id, account.created_at):
        return record
    return UserRecord(account.user_id, account.created_at)


def _target(context: _Context, account: Account) -> _Target | None:
    """*account* as a _Target when it lacks a project, else None."""
    record = _record_of(context, account)
    if all(name in record.projects for name in context.run.templates):
        return None
    return _Target(account, record)


def _provision(context: _Context, accounts: list[Account]) -> None:
    """Give each account with a missing project its projects, tallied in
    *context*. git is checked once, before any project is touched."""
    found = [_target(context, account) for account in accounts]
    targets = [target for target in found if target is not None]
    problem = git_problem() if targets else ""
    if problem:
        say("red", "GitLab projects skipped for every user.", problem)
        context.tally.failed.extend(target.account.username for target in targets)
        return
    context.saved, error = read_saved_tokens(context.run.tokens_path)
    context.saved_error = f"{error}\n" if error else ""
    failed = [t.account.username for t in targets if not _user_projects(context, t)]
    context.tally.failed.extend(failed)


def provision_projects(run: ProjectRun, accounts: list[Account]) -> ProjectTally:
    """Give each account the projects of *run*'s templates, printing a line
    for each project as it is handled.

    Nothing happens when *run* has no templates. A records file that cannot
    be read fails every account, and no project is touched.
    """
    tally = ProjectTally()
    if not run.templates or not accounts:
        return tally
    records, error = read_records()
    if error:
        say("red", "GitLab projects skipped for every user.", error)
        tally.failed.extend(account.username for account in accounts)
        return tally
    _provision(_Context(run, records, tally), accounts)
    return tally
