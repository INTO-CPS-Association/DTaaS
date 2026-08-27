"""Provisions one user's GitLab account and Personal Access Token."""

from dataclasses import dataclass

from ...gitlab_common import CreateOutcome, create_user, create_user_pat


@dataclass(frozen=True)
class ProvisionResult:
    """Outcome of provisioning one user's GitLab account."""

    username: str
    ok: bool
    message: str
    token: str = ""
    already_exists: bool = False
    user_id: int | None = None


def _retry_pat_for_existing_user(gl, username, user_id) -> ProvisionResult:
    """Reissue a PAT for an account this CLI already created (existing_user_id
    came from the registry, not from a fresh 409), skipping create_user
    entirely -- see ensure_user_resources."""
    ok, token_or_error = create_user_pat(gl, user_id, username)
    if not ok:
        return ProvisionResult(
            username,
            False,
            f"PAT retry failed for existing account: {token_or_error}",
            user_id=user_id,
        )
    return ProvisionResult(
        username, True, "GitLab token issued (retry).", token_or_error, user_id=user_id
    )


def ensure_user_resources(
    gl, username, email, password, *, existing_user_id=None
) -> ProvisionResult:
    """Create *username*'s GitLab account and Personal Access Token.

    Idempotent: gitlab_common.create_user never applies *password* to an
    account that already exists (it is left with its current credentials),
    and no PAT is issued in that case either -- re-running this for an
    already-provisioned user is a safe no-op, not a password reset.

    Args:
        gl: Authenticated gitlab.Gitlab client.
        username: GitLab username.
        email: User email address.
        password: Initial password; applied only if the account is newly
            created.
        existing_user_id: The GitLab user_id from a prior *successful*
            creation by this CLI (persisted in the registry), when this
            run's goal is only to retry PAT issuance after that earlier run
            issued no token. When set, create_user is skipped entirely --
            unlike a fresh 409 from create_user, this id did not come from
            GitLab's ambiguous "already exists" response, so it can be
            trusted to belong to an account this CLI itself created.

    Returns:
        A ProvisionResult. ``token`` is set only when a new PAT was issued.
        ``user_id`` is set whenever a CREATED (or retried) account's id is
        known, so callers can persist it for a future retry.
    """
    if existing_user_id is not None:
        return _retry_pat_for_existing_user(gl, username, existing_user_id)

    result = create_user(gl, username=username, email=email, password=password)
    if result.outcome is CreateOutcome.FAILED:
        return ProvisionResult(username, False, result.error)
    if result.outcome is CreateOutcome.ALREADY_EXISTS:
        return ProvisionResult(
            username,
            True,
            "account already exists on GitLab; it was not created by this "
            "run, its credentials are unknown, and no token was issued.",
            already_exists=True,
        )

    assert result.user_id is not None  # guaranteed whenever outcome is CREATED
    ok, token_or_error = create_user_pat(gl, result.user_id, username)
    if not ok:
        return ProvisionResult(
            username,
            False,
            f"GitLab account created but PAT issuance failed: {token_or_error}",
            user_id=result.user_id,
        )
    return ProvisionResult(
        username,
        True,
        "GitLab account and token created.",
        token_or_error,
        user_id=result.user_id,
    )
