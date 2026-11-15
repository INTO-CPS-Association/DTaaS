"""Checks that a user's own token can push to their new project, before
ensure_project creates it.

The push that fills a new project authenticates with the user's own token.
A token GitLab refuses (expired or revoked), one that belongs to another
account, or one without a scope that pushes would leave an empty project
behind, so the token is checked first. GitLab answers
GET /personal_access_tokens/self for a token of any scope, with the id of
its owner, its scopes and whether it is active, so a token with repository
scopes only can be checked too (GET /user would refuse it). The owner is
also looked up with the admin client: an administrator gets no projects,
so nothing a push sets off runs as an administrator.

Only a token GitLab refused (401 or 403) or one whose record shows it
cannot push is to be replaced. When GitLab cannot be reached, or answers
with an error page, the token is not to blame: the hint is to run the
command again.
"""

import gitlab

from .errors import API_ERRORS, describe_api_error
from .messages import with_hint

# The scopes that let a token push over HTTP: api includes write_repository.
PUSH_SCOPES = ("write_repository", "api")
# GitLab's answers to a token it does not accept (401) or lets do nothing (403).
REFUSED_STATUSES = (401, 403)


def _replace_hint(request):
    """What to do about a token that cannot push as *request*'s owner."""
    return (
        "Nothing was created. Replace the token saved for "
        f"{request.username} with a working one with the write_repository "
        f"scope, then run '{request.rerun}' again."
    )


def _retry_hint(request):
    """What to do when GitLab could not answer a check of *request*."""
    return f"Nothing was created. Run '{request.rerun}' again once GitLab answers."


def _read_record(gl, request):
    """GitLab's record of *request*'s token, read with the token itself
    through the admin client *gl*'s URL, TLS setting and timeout. The
    token's client is closed after the one request. Raises API_ERRORS."""
    with gitlab.Gitlab(
        gl.url,
        private_token=request.token,
        ssl_verify=gl.ssl_verify,
        timeout=gl.timeout,
    ) as as_owner:
        return as_owner.http_get("/personal_access_tokens/self")


def _unchecked(exc, request):
    """Why *request*'s token could not be checked, after *exc*, and what to
    do: replace a token GitLab refused, else run the command again."""
    detail = describe_api_error(exc)
    if getattr(exc, "response_code", None) in REFUSED_STATUSES:
        return with_hint(
            f"GitLab refused {request.username}'s token ({detail}). GitLab "
            "answers 401 for a token that expired or was revoked.",
            _replace_hint(request),
        )
    return with_hint(
        f"{request.username}'s token could not be checked: GitLab could not "
        f"be reached or failed ({detail}).",
        _retry_hint(request),
    )


def _scopes(record):
    """The scopes in the token *record*, [] when it names none."""
    scopes = record.get("scopes")
    return scopes if isinstance(scopes, list) else []


def _record_problem(record, request):
    """What in the token *record* stops a push as *request*'s owner, or ""."""
    user = request.username
    owner = record.get("user_id")
    problems = (
        (record.get("active") is not True, f"{user}'s token is not active."),
        (
            owner != request.user_id,
            f"{user}'s token belongs to GitLab user {owner}, not to {user} "
            f"(user {request.user_id}).",
        ),
        (
            not any(scope in _scopes(record) for scope in PUSH_SCOPES),
            f"{user}'s token has neither the write_repository nor the api "
            "scope, so it cannot push.",
        ),
    )
    return next((message for failed, message in problems if failed), "")


def _token_problem(gl, request):
    """Why *request*'s token cannot push as its owner, with what to do, or
    ""."""
    try:
        record = _read_record(gl, request)
    except API_ERRORS as exc:
        return _unchecked(exc, request)
    if not isinstance(record, dict):
        return with_hint(
            f"GitLab gave no details of {request.username}'s token.",
            _retry_hint(request),
        )
    problem = _record_problem(record, request)
    return with_hint(problem, _replace_hint(request)) if problem else ""


def _owner_problem(gl, request):
    """Why *request*'s owner gets no projects, with what to do, or "": an
    administrator never does."""
    try:
        owner = gl.users.get(request.user_id)
    except API_ERRORS as exc:
        return with_hint(
            f"Failed to look up GitLab user {request.user_id}: "
            f"{describe_api_error(exc)}",
            _retry_hint(request),
        )
    if getattr(owner, "is_admin", False) is True:
        return with_hint(
            f"{request.username} is a GitLab administrator. Projects are only "
            "made for regular users, so that nothing a push sets off runs as an "
            "administrator.",
            "Nothing was created.",
        )
    return ""


def push_problem(gl, request):
    """Why *request*'s project must not be created, or "" when its owner's
    token can push to it.

    The token must be one GitLab accepts, be active, belong to the owner
    (request.user_id) and carry write_repository or api, and the owner must
    not be an administrator. Each problem says that nothing was created and
    how to finish: replace the token when it is to blame, run the command
    again when GitLab could not answer.

    Args:
        gl: The admin gitlab.Gitlab client: its URL and TLS setting reach
            GitLab for the token check, and it looks the owner up.
        request: The ProjectRequest, with the owner's id, name and token.
    """
    return _token_problem(gl, request) or _owner_problem(gl, request)
