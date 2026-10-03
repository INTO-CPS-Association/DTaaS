"""Optional GitLab account/PAT/project provisioning for 'user add'.

Split out of users.py to keep both files within a reasonable line count,
mirroring the users_compose.py / users_utils.py split. Driven by the
`[gitlab].provision` flag in dtaas.toml; a GitLab failure never undoes the
container provisioning users.py has already done.

Each user gets two steps, tracked independently in the registry and persisted
as each one finishes: an account with a Personal Access Token, and the
common/user projects seeded from the configured template. A run that
completes one and fails the other retries only the missing half, and an
interrupted run keeps what it had already done. Who is provisioned is
decided in users_gitlab_targets.py, and the disk writes live in
users_gitlab_records.py.
"""

from dataclasses import dataclass, field, replace
import click
from . import gitlab as gitlabPkg
from . import utils
from .constants import GITLAB_USER_TOKENS_FILE
from .messages import echo_hint, with_hint
from .users_gitlab_records import persist_account_result, persist_projects_result
from .users_gitlab_targets import (
    RUN_DEADLINE_MINUTES,
    GitlabUserResult,
    RunDeadline,
    changed_user_id,
    has_gitlab_work,
    not_attempted_notice,
)

PAT_ISSUED_NOTICE = (
    "A Personal Access Token was already issued on an earlier run (see "
    f"{GITLAB_USER_TOKENS_FILE}). A re-run does not reissue one."
)


@dataclass(frozen=True)
class _GitlabRun:
    """What every candidate in this run shares: the GitLab client and the
    project template settings read from dtaas.toml.

    *template_error* holds the complaint about a half configured [gitlab]
    block, which fails the users it affects instead of skipping them.
    """

    gl: object
    templates: object
    template_error: str = ""
    deadline: RunDeadline = field(default_factory=RunDeadline)

    @property
    def wants_projects(self):
        """False only when dtaas.toml configures no template at all, the one
        case in which skipping the project step is what the admin asked for."""
        return self.templates is not None or bool(self.template_error)


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


def _account_skipped(candidate, reason, has_account=True):
    """Report that this candidate's account step was not run, as a skip
    rather than a failure, and carry on to their projects."""
    echo_hint(f"GitLab account step skipped for '{candidate.username}'.", reason)
    return GitlabUserResult(
        candidate.username, None, None, False, has_account=has_account
    )


def _account_step(run, candidate):
    """Create one candidate's GitLab account and Personal Access Token.

    Skipped when the PAT was already issued, since a second token would be
    live on GitLab with no record of it, and skipped without a password
    (there is nothing to create an account with). The PAT check comes first
    so a finished account is reported as that, not as missing a password.
    Both are skips, not failures, so the projects of an account that already
    exists can still be created.
    """
    if candidate.pat_issued:
        return _account_skipped(candidate, PAT_ISSUED_NOTICE)
    if not candidate.password:
        return _account_skipped(
            candidate,
            "No GitLab password supplied for this user.",
            has_account=bool(candidate.existing_user_id),
        )
    result = gitlabPkg.ensure_user_resources(
        run.gl,
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
        has_account=not result.already_exists,
    )


def _skip_projects(run, candidate, account):
    """True when the project step has nothing to do for this candidate.

    No template configured, no account of this CLI's own for the projects to
    belong to, an account step that failed, or projects an earlier run
    already created.
    """
    return (
        not run.wants_projects
        or not account.has_account
        or account.failed
        or candidate.projects_created
    )


def _projects_step(run, candidate, account):
    """Create the candidate's template projects, updating *account* in place.

    A half configured template fails the candidate here rather than skipping
    them: the complaint is already on the console, and passing it off as a
    successful run would leave the user without repositories. The account id
    comes from this run or from the registry; with neither,
    provision_user_projects looks it up by username.
    """
    if _skip_projects(run, candidate, account):
        return account
    if run.template_error:
        account.failed = True
        return account
    target = gitlabPkg.ProjectTarget(
        candidate.username, account.new_id or candidate.existing_user_id
    )
    account.projects_done = gitlabPkg.provision_user_projects(
        run.gl, target, run.templates
    )
    account.failed = not account.projects_done
    return account


def _provision_one_gitlab_user(run, candidate):
    """Provision one candidate's GitLab account, PAT and projects.

    Each half is persisted as soon as it is done. The project step waits on
    a server side import that can take minutes, so a token held in memory
    until the end of the run is a token an interrupted run would lose while
    it stays live on GitLab.

    A failure the API layer did not expect is this user's alone: an
    unreadable token file or a response shaped unlike GitLab's used to abort
    the loop, leaving every later user of the run unattempted with nothing
    said about them.
    """
    try:
        account = _account_step(run, candidate)
        persist_account_result(account)
        result = _projects_step(run, candidate, account)
        persist_projects_result(result)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        echo_hint(f"GitLab provisioning failed for '{candidate.username}'.", exc)
        return GitlabUserResult(candidate.username, None, None, True)
    return result


def _issue_gitlab_resources(run, candidates):
    """Provision candidates until the run's deadline, returning who failed.

    Each user's projects wait on a server side import, so a long list on an
    instance whose imports hang would hold the command for hours. Users the
    run does not reach are reported and left for the next one rather than
    failed: nothing was attempted for them.
    """
    results = []
    for index, candidate in enumerate(candidates):
        if run.deadline.passed():
            click.echo(not_attempted_notice([c.username for c in candidates[index:]]))
            break
        results.append(_provision_one_gitlab_user(run, candidate))
    return [r.username for r in results if r.failed]


def provision_gitlab_users(config_obj, candidates):
    """Create each candidate's GitLab account, PAT and projects, when
    provisioning is enabled.

    Container provisioning is unaffected by a GitLab failure. Returns the
    usernames that could not be provisioned, so add_users can surface a
    command failure (a missing password is not counted). A candidate with a
    registry-stored gitlab_user_id retries PAT issuance directly against it
    rather than calling create_user again; any new id is persisted. A
    candidate already marked gitlab_pat_issued is skipped, so re-running the
    command never mints a second token for the same account, and one already
    marked gitlab_projects_created keeps the projects it has. A password is
    needed by the account half alone, so retrying the projects of an account
    that already exists takes no credentials.
    """
    provision, err = config_obj.get_gitlab_provision()
    utils.check_error(err)
    if not provision or not candidates:
        return []
    minutes, err = config_obj.get_gitlab_import_deadline()
    utils.check_error(err)
    templates, template_error = gitlabPkg.resolve_templates(config_obj)
    deadline = RunDeadline(minutes or RUN_DEADLINE_MINUTES)
    run = _GitlabRun(None, templates, template_error, deadline)
    gl, err = gitlabPkg.resolve_client(config_obj)
    if err is not None:
        echo_hint("GitLab provisioning skipped for every user.", err)
        wants = run.wants_projects
        return [c.username for c in candidates if has_gitlab_work(c, wants)]
    return _issue_gitlab_resources(replace(run, gl=gl), candidates)


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
