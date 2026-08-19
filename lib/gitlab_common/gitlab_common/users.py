"""GitLab user provisioning: create users and issue Personal Access Tokens."""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Sequence, Tuple

import gitlab
import gitlab.exceptions

from .validators import validate_user_row

logger = logging.getLogger(__name__)

# Least-privilege default: repository access only. ``api`` grants full
# read/write across everything the user can reach and subsumes both repository
# scopes, so callers that genuinely need it must ask for it explicitly.
DEFAULT_PAT_SCOPES = ("read_repository", "write_repository")
DEFAULT_PAT_NAME = "dtaas"
DEFAULT_PAT_EXPIRY_DAYS = 365


class CreateOutcome(Enum):
    """What happened to a ``create_user`` request."""

    CREATED = "created"
    ALREADY_EXISTS = "already_exists"
    FAILED = "failed"


@dataclass(frozen=True)
class CreateUserResult:
    """Outcome of ``create_user``.

    ``user_id`` is set only for :attr:`CreateOutcome.CREATED`; it is None for
    both ALREADY_EXISTS and FAILED, so callers must branch on *outcome*
    rather than on the id.
    """

    outcome: CreateOutcome
    user_id: int | None = None
    error: str = ""

    @property
    def ok(self) -> bool:
        """True when GitLab now has the account, whether or not we created it."""
        return self.outcome is not CreateOutcome.FAILED


@dataclass(frozen=True)
class PatOptions:
    """Name, scopes, and lifetime of a Personal Access Token.

    Defaults are least-privilege; widen them explicitly per call site.
    """

    name: str = DEFAULT_PAT_NAME
    scopes: Sequence[str] = DEFAULT_PAT_SCOPES
    expires_days: int = DEFAULT_PAT_EXPIRY_DAYS


def create_user(
    gl: gitlab.Gitlab,
    *,
    username: str,
    email: str,
    password: str,
) -> CreateUserResult:
    """Create a GitLab user via the admin API after validating inputs.

    Inputs are validated with :func:`validate_user_row` before any API call.

    .. warning::
        When GitLab reports the username is already taken (HTTP 409) the
        outcome is :attr:`CreateOutcome.ALREADY_EXISTS`: the account belongs to
        whoever registered it, **the supplied password is not applied**, and no
        credentials are changed. Do not treat that outcome as "these
        credentials are now live"; ``user_id`` is None and callers should not
        issue a token against an account they did not create.

    Args:
        gl: Authenticated gitlab.Gitlab client.
        username: GitLab username (also used as the display name).
        email: User email address.
        password: Initial password, applied only on CREATED.

    Returns:
        A :class:`CreateUserResult`.
    """
    is_valid, validation_error = validate_user_row(username, email, password)
    if not is_valid:
        return CreateUserResult(CreateOutcome.FAILED, error=validation_error)

    payload = {
        "username": username,
        "email": email,
        "password": password,
        "name": username,
        "skip_confirmation": True,
    }
    try:
        user = gl.users.create(payload)
        logger.info("Created GitLab user: %s", username)
        return CreateUserResult(CreateOutcome.CREATED, user_id=user.id)
    except gitlab.exceptions.GitlabCreateError as exc:
        if exc.response_code == 409:
            logger.info("GitLab user already exists: %s", username)
            return CreateUserResult(CreateOutcome.ALREADY_EXISTS)
        return CreateUserResult(
            CreateOutcome.FAILED, error=f"Failed to create user '{username}': {exc}"
        )
    except gitlab.exceptions.GitlabError as exc:
        return CreateUserResult(
            CreateOutcome.FAILED, error=f"Failed to create user '{username}': {exc}"
        )


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
        options: Token name, scopes, and lifetime; least-privilege defaults
            are used when omitted.

    Returns:
        Tuple of (success, token_or_error).
    """
    opts = options or PatOptions()
    # UTC, since GitLab interprets expires_at against its own clock; naive
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
    except gitlab.exceptions.GitlabError as exc:
        return False, f"Failed to create PAT for '{username}': {exc}"
