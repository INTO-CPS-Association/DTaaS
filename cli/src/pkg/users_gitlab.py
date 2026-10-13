"""Optional GitLab account and PAT provisioning for 'user add'.

Split out of users.py to keep both files within a reasonable line count,
mirroring the users_compose.py / users_utils.py split. Driven by the
`[gitlab].provision` flag in dtaas.toml; a GitLab failure never undoes the
container provisioning users.py has already done.

Each user gets an account with a Personal Access Token, tracked in the
registry and persisted as soon as it is issued, so an interrupted run keeps
what it had already done and a re-run never mints a second token. Who is
provisioned is decided in users_gitlab_targets.py, and the disk writes live
in users_gitlab_records.py.
"""

from . import gitlab as gitlabPkg
from . import utils
from .constants import GITLAB_USER_TOKENS_FILE
from .messages import echo_hint, with_hint
from .users_gitlab_records import persist_account_result
from .users_gitlab_targets import GitlabUserResult, changed_user_id

PAT_ISSUED_NOTICE = (
    "A Personal Access Token was already issued on an earlier run (see "
    f"{GITLAB_USER_TOKENS_FILE}). A re-run does not reissue one."
)


def _report_account(username, result):
    """Echo one account outcome; returns the token to persist, if any.

    An already-existing account is warned about but not failed, and yields no
    token: this run did not create it, so its credentials are unknown.
    """
    if not result.ok:
        echo_hint(f"GitLab provisioning failed for '{username}'.", result.message)
        return None
    if result.already_exists:
        echo_hint(f"Warning: GitLab account exists for '{username}'.", result.message)
        return None
    return result.token


def _account_skipped(candidate, reason):
    """Report that this candidate's account step was not run, as a skip
    rather than a failure."""
    echo_hint(f"GitLab account step skipped for '{candidate.username}'.", reason)
    return GitlabUserResult(candidate.username, None, None, False)


def _account_step(gl, candidate):
    """Create one candidate's GitLab account and Personal Access Token.

    Skipped when the PAT was already issued, since a second token would be
    live on GitLab with no record of it, and skipped without a password
    (there is nothing to create an account with). The PAT check comes first
    so a finished account is reported as that, not as missing a password.
    """
    if candidate.pat_issued:
        return _account_skipped(candidate, PAT_ISSUED_NOTICE)
    if not candidate.password:
        return _account_skipped(candidate, "No GitLab password supplied for this user.")
    result = gitlabPkg.ensure_user_resources(
        gl,
        gitlabPkg.GitlabUser(
            candidate.username,
            candidate.email,
            candidate.password,
            existing_user_id=candidate.existing_user_id,
        ),
    )
    return GitlabUserResult(
        candidate.username,
        changed_user_id(result, candidate.existing_user_id),
        _report_account(candidate.username, result),
        not result.ok,
    )


def _provision_one_gitlab_user(gl, candidate):
    """Provision one candidate's GitLab account and PAT, persisting the result.

    A failure the API layer did not expect is this user's alone: an
    unreadable token file or a response shaped unlike GitLab's used to abort
    the loop, leaving every later user of the run unattempted with nothing
    said about them.
    """
    try:
        result = _account_step(gl, candidate)
        persist_account_result(result)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        echo_hint(f"GitLab provisioning failed for '{candidate.username}'.", exc)
        return GitlabUserResult(candidate.username, None, None, True)
    return result


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
        echo_hint("GitLab provisioning skipped for every user.", err)
        return [c.username for c in candidates if c.password and not c.pat_issued]
    results = [_provision_one_gitlab_user(gl, c) for c in candidates]
    return [r.username for r in results if r.failed]


def gitlab_failure_exc(failed):
    """An Exception naming the users whose GitLab provisioning failed, or None."""
    if not failed:
        return None
    return Exception(
        with_hint(
            "GitLab provisioning failed for: " + ", ".join(failed),
            "Their containers were still provisioned.",
        )
    )
