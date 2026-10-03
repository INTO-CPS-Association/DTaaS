"""Provisions one user's GitLab account and Personal Access Token."""

from dataclasses import dataclass

from ...gitlab_common import (
    CreateOutcome,
    create_user,
    create_user_pat,
    with_hint,
)

_ALREADY_EXISTS_SUMMARY = "GitLab reported a conflict; nothing was created."

_ALREADY_EXISTS_DETAIL = (
    "The username is already registered, or its email is already on another "
    "account. Either way the credentials are unknown to this run, so no "
    "token was issued and no projects were created in that namespace. "
    "GitLab said: "
)

# Both halves of the account step are administrator only API calls, so a
# refusal is almost always the token rather than the request. GitLab answers
# an unusable token with 401 and a token whose owner may not act with 403,
# and says no more than that, so the hint names what to check.
PERMISSION_HINT = (
    "Check DTAAS_GITLAB_PAT (or [gitlab].pat): creating users and tokens "
    "needs a non-expired personal access token with the 'api' scope, owned "
    "by an administrator account, and the 'admin_mode' scope as well on an "
    "instance with Admin Mode enabled."
)


def _with_permission_hint(message, error):
    """*message*, plus the token hint when GitLab refused the credentials."""
    refused = "401" in str(error) or "403" in str(error)
    return with_hint(message, PERMISSION_HINT if refused else "")


@dataclass(frozen=True)
class GitlabUser:
    """The account to provision. *existing_user_id* is the GitLab user_id from
    a prior *successful* creation by this CLI (persisted in the registry); when
    set, create_user is skipped and this run only retries PAT issuance against
    that id -- unlike a fresh 409, this id is known to belong to an account
    this CLI itself created."""

    username: str
    email: str
    password: str
    existing_user_id: int | None = None


@dataclass(frozen=True)
class ProvisionResult:
    """Outcome of provisioning one user's GitLab account."""

    username: str
    ok: bool
    message: str
    token: str = ""
    already_exists: bool = False
    user_id: int | None = None


def _issue_pat(gl, username, user_id, *, retry=False) -> ProvisionResult:
    """Issue a PAT for *user_id* and report the outcome. *retry* only changes
    the wording, for the existing-account reissue path."""
    ok, token_or_error = create_user_pat(gl, user_id, username)
    if not ok:
        summary = (
            "PAT retry failed for the existing account."
            if retry
            else "GitLab account created, but no PAT was issued."
        )
        return ProvisionResult(
            username,
            False,
            _with_permission_hint(
                with_hint(summary, token_or_error), token_or_error
            ),
            user_id=user_id,
        )
    message = (
        "GitLab token issued (retry)." if retry else "GitLab account and token created."
    )
    return ProvisionResult(username, True, message, token_or_error, user_id=user_id)


def _create_user_and_pat(gl, user: GitlabUser) -> ProvisionResult:
    """Create the account, then issue its PAT. An already-existing account is a
    safe no-op: create_user never applies *password* to it and no PAT is issued."""
    result = create_user(
        gl, username=user.username, email=user.email, password=user.password
    )
    if result.outcome is CreateOutcome.FAILED:
        return ProvisionResult(
            user.username,
            False,
            _with_permission_hint(
                with_hint("GitLab account creation failed.", result.error), result.error
            ),
        )
    if result.outcome is CreateOutcome.ALREADY_EXISTS:
        return ProvisionResult(
            user.username,
            True,
            with_hint(
                _ALREADY_EXISTS_SUMMARY, f"{_ALREADY_EXISTS_DETAIL}{result.error}"
            ),
            already_exists=True,
        )
    assert result.user_id is not None  # guaranteed whenever outcome is CREATED
    return _issue_pat(gl, user.username, result.user_id)


def ensure_user_resources(gl, user: GitlabUser) -> ProvisionResult:
    """Create *user*'s GitLab account and Personal Access Token.

    Idempotent: re-running this for an already-provisioned user is a safe
    no-op, not a password reset. When *user.existing_user_id* is set,
    create_user is skipped entirely and only PAT issuance is retried.

    Returns:
        A ProvisionResult. ``token`` is set only when a new PAT was issued.
        ``user_id`` is set whenever a CREATED (or retried) account's id is
        known, so callers can persist it for a future retry.
    """
    if user.existing_user_id is not None:
        return _issue_pat(gl, user.username, user.existing_user_id, retry=True)
    return _create_user_and_pat(gl, user)
