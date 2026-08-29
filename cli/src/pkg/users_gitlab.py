"""Optional GitLab account/PAT provisioning for 'user add'.

Split out of users.py to keep both files within a reasonable line count,
mirroring the users_compose.py / users_utils.py split. Driven by the
`[gitlab].provision` flag in dtaas.toml; a GitLab failure never undoes the
container provisioning users.py has already done.
"""

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import click
from . import gitlab as gitlabPkg
from . import utils
from .constants import GITLAB_USER_TOKENS_FILE
from .registry import set_gitlab_pat_issued, set_gitlab_user_ids


def _gitlab_target_usernames(ctx, start_only, passwords):
    """Registry users to attempt GitLab provisioning for this run.

    Mirrors _provision_users' start_only scoping, plus any already-registered
    user who supplied a password again this run even though their container
    isn't being (re)started the explicit retry path after a prior PAT-
    issuance failure, without touching anyone else.
    """
    if start_only is None:
        started = ctx.user_list
    else:
        started = [name for name in start_only if name in ctx.user_list]
    retries = [
        name for name in passwords if name in ctx.user_list and name not in started
    ]
    return started + retries


def _save_gitlab_tokens(tokens):
    """Persist newly issued GitLab PATs, merging with any already saved.

    A username should not already be present -- the gitlab_pat_issued guard
    in _provision_one_gitlab_user stops a re-run from reaching here. If one
    is (e.g. a prior run saved a token then died before recording it in the
    registry), keep the old value under a timestamped key and warn, rather
    than dropping it silently: the old token is still live on GitLab and
    needs manual revocation.
    """
    path = Path(GITLAB_USER_TOKENS_FILE)
    existing = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    for username, token in tokens.items():
        prior = existing.get(username)
        if prior and prior != token:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            existing[f"{username} (superseded {stamp})"] = prior
            click.echo(
                f"Warning: replaced the saved GitLab token for '{username}'; the "
                "previous token is still valid on GitLab and must be revoked "
                "manually."
            )
        existing[username] = token
    utils.write_secret_file(path, json.dumps(existing, indent=2))


@dataclass
class _GitlabCandidate:
    """One registry user queued for GitLab provisioning this run."""

    username: str
    email: str
    existing_user_id: object
    password: object
    pat_issued: bool = False


@dataclass
class _GitlabUserResult:
    """Outcome of provisioning one _GitlabCandidate."""

    username: str
    new_id: object
    token: object
    failed: bool


def gitlab_candidates(ctx, start_only, passwords):
    """A _GitlabCandidate for every user targeted for GitLab provisioning.

    Scoping mirrors _gitlab_target_usernames; a target with no password keeps
    a None password here and is reported skipped by _provision_one_gitlab_user.
    """
    candidates = []
    for username in _gitlab_target_usernames(ctx, start_only, passwords):
        details = ctx.users_section.get(username) or {}
        candidates.append(
            _GitlabCandidate(
                username,
                details.get("email", ""),
                details.get("gitlab_user_id"),
                passwords.get(username),
                bool(details.get("gitlab_pat_issued")),
            )
        )
    return candidates


def _changed_user_id(result, existing_user_id):
    """result.user_id when GitLab returned a new or changed id, else None."""
    if result.user_id is not None and result.user_id != existing_user_id:
        return result.user_id
    return None


def _provision_one_gitlab_user(gl, candidate):
    """Provision one candidate's GitLab account and PAT, returning a
    _GitlabUserResult. A candidate with no password is reported skipped (not
    failed); an already-existing account is warned about but not failed and
    yields no token.
    """
    if not candidate.password:
        click.echo(
            f"GitLab provisioning skipped for '{candidate.username}': "
            "no password supplied."
        )
        return _GitlabUserResult(candidate.username, None, None, False)
    if candidate.pat_issued:
        click.echo(
            f"GitLab provisioning skipped for '{candidate.username}': a Personal "
            "Access Token was already issued on an earlier run (see "
            f"{GITLAB_USER_TOKENS_FILE}). A re-run does not reissue one."
        )
        return _GitlabUserResult(candidate.username, None, None, False)
    result = gitlabPkg.ensure_user_resources(
        gl,
        gitlabPkg.GitlabUser(
            candidate.username,
            candidate.email,
            candidate.password,
            existing_user_id=candidate.existing_user_id,
        ),
    )
    new_id = _changed_user_id(result, candidate.existing_user_id)
    if not result.ok:
        click.echo(
            f"GitLab provisioning failed for '{candidate.username}': {result.message}"
        )
        return _GitlabUserResult(candidate.username, new_id, None, True)
    if result.already_exists:
        click.echo(
            f"Warning: GitLab provisioning for '{candidate.username}': {result.message}"
        )
    token = None if result.already_exists else result.token
    return _GitlabUserResult(candidate.username, new_id, token, False)


def _persist_gitlab_results(results):
    """Persist changed GitLab user ids and newly issued PATs.

    Recording gitlab_pat_issued alongside the saved token is what stops a
    later re-run from minting a second PAT for the same account.
    """
    new_user_ids = {r.username: r.new_id for r in results if r.new_id is not None}
    if new_user_ids:
        set_gitlab_user_ids(new_user_ids)
    tokens = {r.username: r.token for r in results if r.token}
    if tokens:
        _save_gitlab_tokens(tokens)
        set_gitlab_pat_issued(list(tokens))


def _issue_gitlab_resources(gl, candidates):
    """Provision every candidate, persist ids and tokens, and return the
    usernames that failed."""
    results = [_provision_one_gitlab_user(gl, candidate) for candidate in candidates]
    _persist_gitlab_results(results)
    return [r.username for r in results if r.failed]


def provision_gitlab_users(config_obj, candidates):
    """Create each candidate's GitLab account and PAT, when provisioning is
    enabled.

    Container provisioning is unaffected by a GitLab failure. Returns the
    usernames that could not be provisioned, so add_users can surface a
    command failure (a missing password is not counted). A candidate with a
    registry-stored gitlab_user_id retries PAT issuance directly against it
    rather than calling create_user again; any new id is persisted. A
    candidate already marked gitlab_pat_issued is skipped, so re-running the
    command never mints a second token for the same account.
    """
    provision, err = config_obj.get_gitlab_provision()
    utils.check_error(err)
    if not provision or not candidates:
        return []
    gl, err = gitlabPkg.resolve_client(config_obj)
    if err is not None:
        click.echo(f"GitLab provisioning skipped: {err}")
        return [c.username for c in candidates]
    return _issue_gitlab_resources(gl, candidates)


def gitlab_failure_exc(failed):
    """An Exception naming the users whose GitLab provisioning failed, or None."""
    if not failed:
        return None
    return Exception(
        "GitLab provisioning failed for: "
        + ", ".join(failed)
        + " (their containers were still provisioned)"
    )
