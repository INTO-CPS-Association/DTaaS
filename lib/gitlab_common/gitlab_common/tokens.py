"""Personal Access Tokens of provisioned GitLab users: issue and revoke them."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Sequence, Tuple

import gitlab

from .errors import API_ERRORS, describe_api_error

# Least-privilege default: repository access only. ``api`` grants full
# read/write across everything the user can reach and subsumes both repository
# scopes, so callers that genuinely need it must ask for it explicitly.
DEFAULT_PAT_SCOPES = ("read_repository", "write_repository")
DEFAULT_PAT_NAME = "dtaas"
DEFAULT_PAT_EXPIRY_DAYS = 365


@dataclass(frozen=True)
class PatOptions:
    """Name, scopes, and lifetime of a Personal Access Token.

    Defaults are least-privilege: widen them explicitly per call site.
    """

    name: str = DEFAULT_PAT_NAME
    scopes: Sequence[str] = DEFAULT_PAT_SCOPES
    expires_days: int = DEFAULT_PAT_EXPIRY_DAYS


def create_user_pat(
    gl: gitlab.Gitlab,
    user_id: int,
    username: str,
    options: PatOptions | None = None,
) -> Tuple[bool, str]:
    """Create a Personal Access Token for a GitLab user via the admin API.

    Args:
        gl: Authenticated gitlab.Gitlab client.
        user_id: GitLab user ID.
        username: Username (used in error messages).
        options: Token name, scopes, and lifetime. Least-privilege defaults
            are used when omitted.

    Returns:
        Tuple of (success, token_or_error).
    """
    opts = options or PatOptions()
    # UTC, since GitLab interprets expires_at against its own clock: naive
    # local time can land a day off across the boundary.
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=opts.expires_days)
    ).strftime("%Y-%m-%d")
    try:
        user = gl.users.get(user_id)
        pat = user.personal_access_tokens.create(
            {
                "name": opts.name,
                "scopes": list(opts.scopes),
                "expires_at": expires_at,
            }
        )
        token = pat.token
        if not token:
            return False, f"Empty token in PAT response for '{username}'"
        return True, token
    except API_ERRORS as exc:
        return (
            False,
            f"Failed to create PAT for '{username}': {describe_api_error(exc)}",
        )


def revoke_user_pats(
    gl: gitlab.Gitlab, user_id: int, name: str = DEFAULT_PAT_NAME
) -> Tuple[bool, str]:
    """Revoke a GitLab user's active Personal Access Tokens named *name*.

    Only tokens with that name are revoked, so a token the user made for
    themselves under another name keeps working. Finding none is a success:
    there is nothing left to revoke.

    Args:
        gl: Authenticated gitlab.Gitlab client, owned by an administrator.
        user_id: GitLab user ID.
        name: Name of the tokens to revoke.

    Returns:
        Tuple of (success, error): *error* is empty on success.
    """
    try:
        tokens = gl.personal_access_tokens.list(
            user_id=user_id, state="active", get_all=True
        )
        for token in tokens:
            if token.name == name:
                gl.personal_access_tokens.delete(token.id)
        return True, ""
    except API_ERRORS as exc:
        return (
            False,
            f"Failed to revoke the tokens of GitLab user {user_id}: "
            f"{describe_api_error(exc)}",
        )
