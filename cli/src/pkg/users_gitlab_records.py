"""Persists the outcome of GitLab provisioning for 'user add'.

The disk half of users_gitlab.py: the issued Personal Access Tokens, which
go to a 0600 credentials file, and the per user registry markers that make a
re-run skip the work it already did. Kept apart from the provisioning flow
itself so each module stays within a reasonable line count, mirroring the
users.py / users_compose.py split.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
import click
from . import utils
from .constants import GITLAB_USER_TOKENS_FILE
from .messages import echo_hint
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
            "The previous token is still valid on GitLab and must be revoked "
            "manually.",
        )


def _save_gitlab_tokens(tokens):
    """Persist newly issued GitLab PATs, merging with any already saved.

    A username should not already be present, the gitlab_pat_issued guard
    in users_gitlab._account_step stops a re-run from reaching here. If one
    is (e.g. a prior run saved a token then died before recording it in the
    registry), keep the old value under a timestamped key and warn, rather
    than dropping it silently: the old token is still live on GitLab and
    needs manual revocation.
    """
    path = Path(GITLAB_USER_TOKENS_FILE)
    existing = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
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
    if not path.is_file():
        return []
    tokens = json.loads(path.read_text(encoding="utf-8"))
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


def release_gitlab_records(users_section, usernames):
    """Stop tracking the deleted users' GitLab resources, and say what stays.

    'user delete' removes a workspace, never a GitLab account: the account
    and the Personal Access Token issued to it stay where they are, and only
    a GitLab admin can remove them. The saved token is dropped here, so the
    credentials file never claims a token for a user the CLI no longer
    tracks, and what is left behind is reported, since re-adding the same
    username finds the account already there and will not reissue a token.
    """
    tracked = _gitlab_tracked(users_section, usernames)
    _forget_gitlab_tokens(tracked)
    if tracked:
        listed = ", ".join(f"'{name}'" for name in tracked)
        echo_hint(
            f"Note: nothing was removed in GitLab for {listed}.",
            "The accounts and their tokens stay there, "
            f"and the saved token was dropped from {GITLAB_USER_TOKENS_FILE}, "
            "so it can now only be revoked in GitLab. Delete the account "
            "there before re-adding the same username.",
        )
