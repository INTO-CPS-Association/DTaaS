"""Provisions one user's GitLab account and Personal Access Token."""

from dataclasses import dataclass

from ...gitlab_common import CreateOutcome, create_user, create_user_pat

_ALREADY_EXISTS_MESSAGE = (
    "account already exists on GitLab; it was not created by this "
    "run, its credentials are unknown, and no token was issued."
)


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
        prefix = (
            "PAT retry failed for existing account: "
            if retry
            else "GitLab account created but PAT issuance failed: "
        )
        return ProvisionResult(
            username, False, f"{prefix}{token_or_error}", user_id=user_id
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
        return ProvisionResult(user.username, False, result.error)
    if result.outcome is CreateOutcome.ALREADY_EXISTS:
        return ProvisionResult(
            user.username, True, _ALREADY_EXISTS_MESSAGE, already_exists=True
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
