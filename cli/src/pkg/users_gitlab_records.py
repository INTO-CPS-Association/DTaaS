"""Persists the outcome of GitLab provisioning for 'user add', and releases
it on 'user delete'.

The disk half of users_gitlab.py: the issued Personal Access Tokens, which
go to a 0600 credentials file, and the per user registry markers that make a
re-run skip the work it already did. On delete, the tokens are revoked on
GitLab before their saved copies are dropped. Kept apart from the provisioning flow
itself so each module stays within a reasonable line count, mirroring the
users.py / users_compose.py split.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from . import gitlab as gitlabPkg
from . import utils
from .config import Config
from .constants import GITLAB_USER_TOKENS_FILE
from .messages import echo_hint, with_hint
from .registry import set_gitlab_pat_issued, set_gitlab_user_ids


def _keep_superseded(existing, username, token):
    """Park any different token already saved for *username* under a
    timestamped key, and warn, rather than dropping it silently."""
    prior = existing.get(username)
    if prior and prior != token:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        existing[f"{username} (superseded {stamp})"] = prior
        echo_hint(
            f"Warning: replaced the saved GitLab token for '{username}'.",
            "The previous token is kept in the file. If it is still active "
            "on GitLab, revoke it there.",
        )


def _load_tokens(path):
    """The saved tokens in *path*, {} when there is no file yet.

    Raises ValueError for a file that is not a JSON object, OSError for one
    that cannot be read.
    """
    if not path.is_file():
        return {}
    tokens = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(tokens, dict):
        raise ValueError(f"{path.name} does not hold a JSON object.")
    return tokens


def _clear_stale_tmp(path):
    """Remove the temp file an interrupted save left next to *path*."""
    tmp = utils.secret_tmp_path(path)
    if tmp.exists():
        tmp.unlink()
        echo_hint(
            f"Warning: removed a leftover {tmp.name}.",
            "An earlier run was interrupted while saving tokens. A token it "
            "issued but did not save is revoked when that user is retried.",
        )


def check_token_file():
    """Make sure the token file can be read and written, before any token is
    issued: a token GitLab issues but this CLI cannot save is a live
    credential nobody holds.

    Clears a temp file an interrupted save left behind (it would make every
    save fail), then rewrites the file with its own contents.

    Returns:
        None, or an Exception naming the file and why it cannot be used.
    """
    path = Path(GITLAB_USER_TOKENS_FILE)
    try:
        _clear_stale_tmp(path)
        utils.write_secret_file(path, json.dumps(_load_tokens(path), indent=2))
    except (OSError, ValueError) as exc:
        return Exception(
            with_hint(f"{GITLAB_USER_TOKENS_FILE} cannot be used.", exc)
        )
    return None


def _save_gitlab_tokens(tokens):
    """Persist newly issued GitLab PATs, merging with any already saved.

    A username should not already be present, the gitlab_pat_issued guard
    in users_gitlab._account_step stops a re-run from reaching here. If one
    is (e.g. a prior run saved a token then died before recording it in the
    registry), keep the old value under a timestamped key and warn, rather
    than dropping it silently: it may still be live on GitLab.
    """
    path = Path(GITLAB_USER_TOKENS_FILE)
    existing = _load_tokens(path)
    for username, token in tokens.items():
        _keep_superseded(existing, username, token)
        existing[username] = token
    utils.write_secret_file(path, json.dumps(existing, indent=2))


def persist_account_result(result):
    """Persist one user's changed GitLab id and newly issued PAT.

    Called as soon as the user's account step is done, not at the end of the
    run: a token kept in memory while later users are provisioned is one an
    interrupted run loses while it stays live on GitLab, and the next run
    would then mint a second one. Recording gitlab_pat_issued alongside the
    saved token is what prevents that.

    The account is reported here rather than when it is created, so the line
    appears only once its token is safely on disk, and a run that fails
    later still shows that a live token was issued.
    """
    if result.new_id is not None:
        set_gitlab_user_ids({result.username: result.new_id})
    if result.token:
        _save_gitlab_tokens({result.username: result.token})
        set_gitlab_pat_issued([result.username])
        echo_hint(
            f"GitLab account and token created for '{result.username}'.",
            f"The token is in {GITLAB_USER_TOKENS_FILE}.",
        )


def _forget_gitlab_tokens(usernames):
    """Drop *usernames* from the saved token file; returns the names dropped."""
    path = Path(GITLAB_USER_TOKENS_FILE)
    tokens = _load_tokens(path)
    dropped = [name for name in usernames if tokens.pop(name, None) is not None]
    if dropped:
        utils.write_secret_file(path, json.dumps(tokens, indent=2))
    return dropped


def _gitlab_tracked(users_section, usernames):
    """The *usernames* the registry records any GitLab resource for."""
    return [
        name
        for name in usernames
        if any(str(key).startswith("gitlab_") for key in users_section.get(name) or {})
    ]


ACCOUNT_STAYS = (
    "The GitLab account stays. Delete it in GitLab before adding the same "
    "username again."
)


def _client_for_release():
    """The admin GitLab client from dtaas.toml, as (client, err).

    Built whatever [gitlab].provision says now: a token recorded in the
    registry is still valid on GitLab after provisioning is switched off.
    """
    try:
        config_obj = Config()
    except RuntimeError as exc:
        return None, exc
    return gitlabPkg.resolve_client(config_obj)


def _revoke(gl, user_id):
    """Revoke the tokens of the account *user_id*; returns (ok, message)."""
    if user_id is None:
        return False, "No GitLab account id is recorded for this user."
    return gitlabPkg.revoke_issued_tokens(gl, user_id)


def _not_revoked(listed, reason):
    """Report users whose token is still valid, and why."""
    echo_hint(
        f"GitLab token not revoked for {listed}.",
        f"{reason}\nThe token is still valid and stays in "
        f"{GITLAB_USER_TOKENS_FILE}; revoke it in GitLab.",
    )


def _release_one(gl, username, user_id):
    """Revoke one user's tokens, then drop the saved copy; True when revoked."""
    ok, message = _revoke(gl, user_id)
    if not ok:
        _not_revoked(f"'{username}'", message)
        return False
    echo_hint(f"GitLab token revoked for '{username}'.", ACCOUNT_STAYS)
    try:
        _forget_gitlab_tokens([username])
    except (OSError, ValueError) as exc:
        echo_hint(
            f"Warning: {GITLAB_USER_TOKENS_FILE} was not updated.",
            f"{exc}\nThe revoked token for '{username}' is still listed there.",
        )
    return True


def release_gitlab_records(users_section, usernames):
    """Revoke the deleted users' GitLab tokens and stop tracking them.

    'user delete' removes a workspace, never a GitLab account: the account
    stays, but the tokens this CLI issued to it are revoked, so a deleted
    user loses repository access. A saved token is dropped only once it is
    revoked; one that could not be revoked stays in the credentials file, so
    the CLI's copy of a live credential is never lost.

    Returns:
        The usernames whose tokens could not be revoked.
    """
    tracked = _gitlab_tracked(users_section, usernames)
    if not tracked:
        return []
    gl, err = _client_for_release()
    if err is not None:
        _not_revoked(", ".join(f"'{name}'" for name in tracked), err)
        return tracked
    return [
        name
        for name in tracked
        if not _release_one(gl, name, users_section[name].get("gitlab_user_id"))
    ]


def revoke_failure_exc(failed):
    """An Exception naming the users whose token is still valid, or None."""
    if not failed:
        return None
    return Exception(
        with_hint(
            "GitLab tokens not revoked for: " + ", ".join(failed),
            "Their workspaces were still deleted.",
        )
    )
