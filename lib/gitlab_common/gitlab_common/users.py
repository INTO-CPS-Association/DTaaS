"""GitLab user provisioning: create users and look them up. Their Personal
Access Tokens are tokens.py's."""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Tuple

import gitlab
import gitlab.exceptions

from .errors import API_ERRORS, describe_api_error

from .validators import validate_user_row

logger = logging.getLogger(__name__)

class CreateOutcome(Enum):
    """What happened to a ``create_user`` request."""

    CREATED = "created"
    ALREADY_EXISTS = "already_exists"
    FAILED = "failed"


@dataclass(frozen=True)
class CreateUserResult:
    """Outcome of ``create_user``.

    ``user_id`` is set only for :attr:`CreateOutcome.CREATED`. It is None for
    both ALREADY_EXISTS and FAILED, so callers must branch on *outcome*
    rather than on the id. ``created_at`` is GitLab's creation time of that
    account (empty when GitLab gives none). With the id it tells the
    account apart from a later one of the same name: a reinstalled GitLab
    hands out the same ids again, never the same creation time.

    ``error`` carries GitLab's own words in both of the other cases: why the
    request failed for FAILED, and which conflict it reported for
    ALREADY_EXISTS. GitLab answers 409 both for a username that is taken and
    for an email that is already on another account, and those are different
    problems for an admin, so the reason is passed on rather than flattened
    into one message.
    """

    outcome: CreateOutcome
    user_id: int | None = None
    error: str = ""
    created_at: str = ""

    @property
    def ok(self) -> bool:
        """True when GitLab now has the account, whether or not we created it."""
        return self.outcome is not CreateOutcome.FAILED


@dataclass(frozen=True)
class UserInfo:
    """A GitLab account as find_user finds it: its id, its creation time
    (see CreateUserResult) and whether it is an administrator."""

    user_id: int
    created_at: str
    is_admin: bool = False


def _created_at(user) -> str:
    """GitLab's creation time of *user*, "" when the answer has none."""
    created_at = getattr(user, "created_at", "")
    return created_at if isinstance(created_at, str) else ""


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
        When GitLab reports a conflict (HTTP 409) the outcome is
        :attr:`CreateOutcome.ALREADY_EXISTS`: either the username belongs to
        whoever registered it or the email is already on another account.
        **The supplied password is not applied** and no credentials are
        changed; GitLab's own reason is in ``error``. Do not treat that outcome as "these
        credentials are now live"; ``user_id`` is None and callers should
        not issue a token against an account they did not create: its owner
        is unknown to this run.

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
        return CreateUserResult(
            CreateOutcome.CREATED, user_id=user.id, created_at=_created_at(user)
        )
    except gitlab.exceptions.GitlabCreateError as exc:
        if exc.response_code == 409:
            logger.info("GitLab reported a conflict for '%s': %s", username, exc)
            return CreateUserResult(
                CreateOutcome.ALREADY_EXISTS, error=describe_api_error(exc)
            )
        return CreateUserResult(
            CreateOutcome.FAILED,
            error=f"Failed to create user '{username}': {describe_api_error(exc)}",
        )
    except API_ERRORS as exc:
        return CreateUserResult(
            CreateOutcome.FAILED,
            error=f"Failed to create user '{username}': {describe_api_error(exc)}",
        )


def find_user(gl: gitlab.Gitlab, username: str) -> Tuple[UserInfo | None, str]:
    """Look up the GitLab account whose username is *username*, with *gl*,
    an administrator's client (which sees each account's creation time and
    whether it is an administrator): (UserInfo, "") or (None, why not).

    Lists ``GET /users?username=`` and keeps only the account whose
    username matches, ignoring case as GitLab does (it allows one account
    per name in any case), so a similar name is never taken for the account.
    """
    wanted = username.lower()
    try:
        listed = gl.users.list(username=username, iterator=True)
        user = next(
            (found for found in listed if found.username.lower() == wanted), None
        )
    except API_ERRORS as exc:
        return (
            None,
            f"Failed to look up GitLab user '{username}': {describe_api_error(exc)}",
        )
    if user is None:
        return None, f"GitLab has no user named '{username}'."
    is_admin = getattr(user, "is_admin", False) is True
    return UserInfo(user.id, _created_at(user), is_admin), ""
