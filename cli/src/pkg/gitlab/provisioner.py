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


def ensure_user_resources(gl, username, email, password) -> ProvisionResult:
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

    Returns:
        A ProvisionResult. ``token`` is set only when a new PAT was issued.
    """
    result = create_user(gl, username=username, email=email, password=password)
    if result.outcome is CreateOutcome.FAILED:
        return ProvisionResult(username, False, result.error)
    if result.outcome is CreateOutcome.ALREADY_EXISTS:
        return ProvisionResult(username, True, "GitLab account already exists.")

    assert result.user_id is not None  # guaranteed whenever outcome is CREATED
    ok, token_or_error = create_user_pat(gl, result.user_id, username)
    if not ok:
        return ProvisionResult(
            username,
            False,
            f"GitLab account created but PAT issuance failed: {token_or_error}",
        )
    return ProvisionResult(
        username, True, "GitLab account and token created.", token_or_error
    )
