"""Picks the users a 'user add' run attempts GitLab provisioning for.

The selection half of users_gitlab.py, which does the provisioning itself:
which registry users are in scope this run, what the registry already
records about each of them, and how long the run may go on starting new
ones. Kept apart so each module stays within a reasonable line count,
mirroring the users.py / users_compose.py split.
"""

import time
from dataclasses import dataclass, field

from .registry import load_starting_gitlab

# How long a run may spend before it stops starting new users, unless
# [gitlab].import_deadline says otherwise. Each project waits on a server
# side import, so without a budget a bulk add on an instance whose imports
# hang would hold the command for hours.
RUN_DEADLINE_MINUTES = 60


@dataclass
class RunDeadline:
    """The clock a GitLab run stops starting new users by.

    Started when the run does, so the budget covers the whole run rather
    than any single import; users not reached are left for the next run.
    """

    minutes: int = RUN_DEADLINE_MINUTES
    started: float = field(default_factory=time.monotonic)

    def passed(self):
        """True once the run has been going longer than its budget."""
        return time.monotonic() - self.started > self.minutes * 60


def not_attempted_notice(usernames):
    """The line reporting the users a run stopped short of."""
    return (
        "GitLab provisioning stopped after the run's import deadline; not "
        f"attempted: {', '.join(usernames)}. Re-run 'dtaas user add' for them."
    )


@dataclass
class GitlabCandidate:
    """One registry user queued for GitLab provisioning this run."""

    username: str
    email: str
    existing_user_id: object
    password: object
    pat_issued: bool = False
    projects_created: bool = False


@dataclass
class GitlabUserResult:
    """What a run ends up having done for one GitlabCandidate.

    Lives here with the candidate it comes from: this module holds the run's
    per user bookkeeping, while users_gitlab.py does the provisioning.

    *has_account* is False when this run has no account of its own to create
    projects in: the account step was skipped for want of a password and no
    earlier run left one, or the account turned out to exist already and so
    belongs to whoever registered it.
    """

    username: str
    new_id: object
    token: object
    failed: bool
    projects_done: bool = False
    has_account: bool = True


def changed_user_id(result, existing_user_id):
    """result.user_id when GitLab returned a new or changed id, else None."""
    if result.user_id is not None and result.user_id != existing_user_id:
        return result.user_id
    return None


def has_gitlab_work(candidate, wants_projects):
    """True when this candidate has GitLab work left to attempt.

    A password means an account to create; without one there is still the
    project half to retry, but only for a user who has an account already
    and only where a template is configured at all. Neither leaves nothing
    to do, so a client that cannot be built is not their failure to carry:
    a deployment that provisions accounts without repositories never fails
    a user whose token was issued long ago.
    """
    if candidate.password:
        return True
    if not wants_projects or candidate.projects_created:
        return False
    return bool(candidate.pat_issued or candidate.existing_user_id)


def target_usernames(ctx, start_only, passwords):
    """Registry users to attempt GitLab provisioning for this run.

    Mirrors _provision_users' start_only scoping, plus any already-registered
    user named again this run (a key of *passwords*, with or without a
    password) even though their container isn't being (re)started: the
    explicit retry path after a prior GitLab failure, without touching
    anyone else.
    """
    if start_only is None:
        started = ctx.user_list
    else:
        started = [name for name in start_only if name in ctx.user_list]
    retries = [
        name for name in passwords if name in ctx.user_list and name not in started
    ]
    return started + retries


def _candidate(username, details, password):
    """One candidate, from whatever store holds this username's markers."""
    return GitlabCandidate(
        username,
        details.get("email", ""),
        details.get("gitlab_user_id"),
        password,
        bool(details.get("gitlab_pat_issued")),
        bool(details.get("gitlab_projects_created")),
    )


def _starting_candidates(ctx, passwords):
    """The dtaas.toml starting users named this run.

    Their workspace containers come from docker-compose.yml, so they are
    never registry users and nothing here starts or rewrites them: naming
    one in 'user add' asks for its GitLab half alone. Their email comes from
    dtaas.toml and their markers from the registry's starting user section,
    which is keyed the same way as the user store.
    """
    markers = load_starting_gitlab()
    return [
        _candidate(
            name,
            {**markers.get(name, {}), "email": ctx.starting[name]},
            passwords.get(name),
        )
        for name in passwords
        if name in ctx.starting and name not in ctx.user_list
    ]


def gitlab_candidates(ctx, start_only, passwords):
    """A GitlabCandidate for every user targeted for GitLab provisioning.

    Scoping mirrors target_usernames, plus the starting users named this
    run; a target with no password keeps a None password here, and
    users_gitlab skips only the account half for them, so a user whose
    account exists still has their projects attempted.
    """
    registered = [
        _candidate(name, ctx.users_section.get(name) or {}, passwords.get(name))
        for name in target_usernames(ctx, start_only, passwords)
    ]
    return registered + _starting_candidates(ctx, passwords)
