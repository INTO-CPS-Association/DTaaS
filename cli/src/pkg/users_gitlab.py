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

from dataclasses import dataclass

from . import gitlab as gitlabPkg
from . import utils
from .constants import GITLAB_USER_TOKENS_FILE
from .messages import echo_hint, with_hint
from .users_gitlab_records import check_token_file, persist_account_result
from .users_gitlab_targets import GitlabUserResult, changed_user_id

PAT_ISSUED_NOTICE = (
    "A Personal Access Token was already issued on an earlier run (see "
    f"{GITLAB_USER_TOKENS_FILE}). A re-run does not reissue one."
)


def _report_account(username, result):
    """Echo one account outcome; returns the token to persist, if any.

    An account that already existed on GitLab is a failure: this run did not
    create it, so it issues no token, and the user is left without one.
    """
    if not result.ok:
        echo_hint(f"GitLab provisioning failed for '{username}'.", result.message)
        return None
    return result.token


def _account_skipped(candidate, reason):
    """Report that this candidate's account step was not run, as a skip
    rather than a failure."""
    echo_hint(f"GitLab account step skipped for '{candidate.username}'.", reason)
    return GitlabUserResult(candidate.username, None, None, False)


def _has_work(candidate):
    """True when the account step can do something for *candidate*: create
    its account (a password), or retry the token of an account this CLI
    created earlier (an account id)."""
    has_input = candidate.password or candidate.existing_user_id is not None
    return bool(has_input) and not candidate.pat_issued


def _account_step(gl, candidate):
    """Create one candidate's GitLab account and Personal Access Token.

    Skipped when the PAT was already issued, since a second token would be
    live on GitLab with no record of it. An account this CLI created earlier
    (an account id, no token) needs no password: only its token is retried.
    Any other candidate is skipped without a password, as there is nothing to
    create an account with. The PAT check comes first so a finished account
    is reported as that, not as missing a password.
    """
    if candidate.pat_issued:
        return _account_skipped(candidate, PAT_ISSUED_NOTICE)
    if not _has_work(candidate):
        return _account_skipped(candidate, "No GitLab password supplied for this user.")
    result = gitlabPkg.ensure_user_resources(
        gl,
        gitlabPkg.GitlabUser(
            candidate.username,
            candidate.email,
            candidate.password or "",
            existing_user_id=candidate.existing_user_id,
        ),
    )
    return GitlabUserResult(
        candidate.username,
        changed_user_id(result, candidate.existing_user_id),
        _report_account(candidate.username, result),
        not result.ok,
    )


@dataclass(frozen=True)
class _UnsavedToken:
    """A token GitLab issued for *username* that this run could not save."""

    username: str
    user_id: object
    reason: Exception


def _failed(username, reason):
    """Report one user's GitLab step as failed."""
    echo_hint(f"GitLab provisioning failed for '{username}'.", reason)
    return GitlabUserResult(username, None, None, True)


def _token_not_saved(gl, unsaved):
    """Revoke a token that was issued but could not be saved, and say so.

    Nobody holds such a token, so it is revoked at once rather than left
    live on GitLab; if that fails too, the admin is told to revoke it.
    """
    name = unsaved.username
    revoked, reason = gitlabPkg.revoke_issued_tokens(gl, unsaved.user_id)
    if revoked:
        echo_hint(
            f"GitLab token for '{name}' not saved; revoked.",
            f"{unsaved.reason}\nOnce tokens can be saved to "
            f"{GITLAB_USER_TOKENS_FILE} again, run 'dtaas user add {name}' "
            "to issue a new one.",
        )
    else:
        echo_hint(
            f"GitLab token for '{name}' not saved, still valid.",
            f"{unsaved.reason}\n{reason}\nRevoke it in GitLab.",
        )
    return GitlabUserResult(name, None, None, True, token_lost=True)


def _provision_one_gitlab_user(gl, candidate):
    """Provision one candidate's GitLab account and PAT, persisting the result.

    A failure the API layer did not expect is this user's alone: a response
    shaped unlike GitLab's used to abort the loop, leaving every later user
    of the run unattempted with nothing said about them. A token that was
    issued but could not be saved is revoked (_persisted).
    """
    try:
        result = _account_step(gl, candidate)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        return _failed(candidate.username, exc)
    return _persisted(gl, candidate, result)


def _persisted(gl, candidate, result):
    """*result* once it is on disk; a token that could not be saved is
    revoked (_token_not_saved)."""
    try:
        persist_account_result(result)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        if not result.token:
            return _failed(candidate.username, exc)
        user_id = result.new_id or candidate.existing_user_id
        return _token_not_saved(gl, _UnsavedToken(candidate.username, user_id, exc))
    return result


def _attemptable(candidates):
    """The candidates a run would create an account or a token for."""
    return [c.username for c in candidates if _has_work(c)]


def _skip_rest(candidates):
    """Fail the candidates left once tokens can no longer be saved."""
    pending = _attemptable(candidates)
    if pending:
        echo_hint(
            "GitLab provisioning stopped for: " + ", ".join(pending),
            f"Tokens cannot be saved to {GITLAB_USER_TOKENS_FILE}, so no "
            "further token is issued this run.",
        )
    return [GitlabUserResult(name, None, None, True) for name in pending]


def _provision_all(gl, candidates):
    """Provision each candidate in turn, stopping once a token could not be
    saved: every later save would fail the same way."""
    results = []
    for index, candidate in enumerate(candidates):
        results.append(_provision_one_gitlab_user(gl, candidate))
        if results[-1].token_lost:
            return results + _skip_rest(candidates[index + 1 :])
    return results


def _gitlab_client(config_obj):
    """The admin GitLab client, once the token file is known to be usable.

    Returns:
        Tuple of (client, err)
    """
    gl, err = gitlabPkg.resolve_client(config_obj)
    if err is None:
        err = check_token_file()
    return gl, err


def provision_gitlab_users(config_obj, candidates):
    """Create each candidate's GitLab account and PAT, when provisioning is
    enabled.

    Container provisioning is unaffected by a GitLab failure. Returns the
    usernames that could not be provisioned, so add_users can surface a
    command failure (a missing password is not counted). A candidate with a
    registry-stored gitlab_user_id retries PAT issuance directly against it
    rather than calling create_user again; any new id is persisted. A
    candidate already marked gitlab_pat_issued is skipped, so re-running the
    command never mints a second token for the same account. Nothing is
    attempted while the token file cannot be read or written.
    """
    provision, err = config_obj.get_gitlab_provision()
    utils.check_error(err)
    if not provision or not candidates:
        return []
    gl, err = _gitlab_client(config_obj)
    if err is not None:
        echo_hint("GitLab provisioning skipped for every user.", err)
        return _attemptable(candidates)
    return [r.username for r in _provision_all(gl, candidates) if r.failed]


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
