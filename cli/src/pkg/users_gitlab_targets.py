"""Picks the users a 'user add' run attempts GitLab provisioning for.

The selection half of users_gitlab.py, which does the provisioning itself:
which registry users are in scope this run, and what the registry already
records about each of them. Kept apart so each module stays within a reasonable line count,
mirroring the users.py / users_compose.py split.
"""

from dataclasses import dataclass

from .registry import load_starting_gitlab

@dataclass
class GitlabCandidate:
    """One registry user queued for GitLab provisioning this run."""

    username: str
    email: str
    existing_user_id: object
    password: object
    pat_issued: bool = False


@dataclass
class GitlabUserResult:
    """What a run ends up having done for one GitlabCandidate.

    Lives here with the candidate it comes from: this module holds the run's
    per user bookkeeping, while users_gitlab.py does the provisioning.
    """

    username: str
    new_id: object
    token: object
    failed: bool


def changed_user_id(result, existing_user_id):
    """result.user_id when GitLab returned a new or changed id, else None."""
    if result.user_id is not None and result.user_id != existing_user_id:
        return result.user_id
    return None


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
    users_gitlab reports their account step as skipped.
    """
    registered = [
        _candidate(name, ctx.users_section.get(name) or {}, passwords.get(name))
        for name in target_usernames(ctx, start_only, passwords)
    ]
    return registered + _starting_candidates(ctx, passwords)
