"""Creates a provisioned user's GitLab projects from the configured template.

Deployment specific glue over gitlab_common.ensure_user_projects: it turns
the [gitlab] settings of dtaas.toml into the two template repositories every
DTaaS user's projects are imported from, resolves the GitLab account id to
create them under, and reports each outcome on the console. The GitLab API
work and the common/user pairing itself are gitlab_common's, the way
users_gitlab.py stays out of provisioner.py.
"""

from dataclasses import dataclass

import click

from ...gitlab_common import (
    COMMON_PROJECT_NAME,
    IMPORT_TIMEOUT_MINUTES,
    MESSAGE_WARNING,
    USER_PROJECT_NAME,
    ProjectTemplates,
    ensure_user_projects,
    find_user_id,
)

NO_TEMPLATE_NOTICE = (
    "GitLab project creation skipped: no project templates in dtaas.toml. "
    "Set [gitlab] common_template and user_template (the generated "
    "dtaas.toml ships the DTaaS values)."
)


def resolve_templates(config_obj):
    """The [gitlab] project template settings, read from dtaas.toml.

    Mirrors client.resolve_client: the one place the deployment's config is
    turned into what the project calls below need.

    [gitlab].import_timeout rides along here: it is optional and independent
    of the template keys, so a missing one keeps gitlab_common's default.

    Returns:
        Tuple of (templates, error). Both are empty when dtaas.toml
        configures no template at all, a supported opt out reported here as
        a one line notice. A half configured [gitlab] block is a typo rather
        than an opt out, the rule config validate already applies, so it
        yields the error text and the caller fails the users it affects.
    """
    values, err = config_obj.get_gitlab_templates()
    timeout, timeout_err = config_obj.get_gitlab_import_timeout()
    err = err or timeout_err
    if err is not None:
        click.echo(f"GitLab project creation failed: {err}")
        return None, str(err)
    if values is None:
        click.echo(NO_TEMPLATE_NOTICE)
        return None, ""
    templates = ProjectTemplates(
        values["common_template"],
        values["user_template"],
        timeout or IMPORT_TIMEOUT_MINUTES,
    )
    return templates, ""


@dataclass(frozen=True)
class ProjectTarget:
    """The user to create projects for. *user_id* is their GitLab account id
    when it is already known (the account was created this run, or its id is
    stored in the registry); None means it has to be looked up by username."""

    username: str
    user_id: int | None = None


def _resolve_user_id(gl, target):
    """*target*'s GitLab id, looked up by username when it is not known.

    Only accounts this CLI created reach here (an account that already
    existed is reported and left alone, projects included), so the lookup
    covers the one case its caller cannot supply an id for: an account
    created before its id reached the registry.
    """
    if target.user_id is not None:
        return target.user_id
    user_id = find_user_id(gl, target.username)
    if user_id is not None:
        click.echo(
            f"Note: the GitLab id for '{target.username}' was not in the "
            "registry and was resolved by username."
        )
    return user_id


# Projects are created through GitLab's administrator only "create project
# for user" endpoint, which runs the creation as the user it is for. A 403
# therefore has two possible owners, and GitLab's own answer names neither.
FORBIDDEN_HINT = (
    "Note: GitLab refused the admin only 'create project for user' call, "
    "which it runs as the account itself: check that the PAT owner is an "
    "administrator, and that the account may create projects "
    "(GET /api/v4/users/<id> reports projects_limit and can_create_project; "
    "an instance whose default projects limit is 0 refuses every new "
    "account)."
)


def _project_line(username: str, message) -> str:
    """One console line for a project outcome, labelled by its level.

    A project that already existed is prefixed the way an account that
    already existed is in users_gitlab.py: it is worth an admin's attention
    without being a failure of the run.
    """
    prefix = "Warning: " if message.level == MESSAGE_WARNING else ""
    return f"{prefix}GitLab projects for '{username}': {message.text}"


def _report_messages(username: str, messages) -> None:
    """Report every project outcome, and the 403 hint at most once.

    Both of a user's projects are refused by the same misconfiguration, so
    the hint belongs to the user rather than to each line: the bare
    "403 Forbidden" GitLab answers with says nothing about which of its two
    causes applies, but it only needs saying once.
    """
    for message in messages:
        click.echo(_project_line(username, message))
    if any("403" in message.text for message in messages):
        click.echo(FORBIDDEN_HINT)


def provision_user_projects(gl, target, templates):
    """Create *target*'s two GitLab projects, reporting each outcome.

    Returns:
        True when both projects exist afterwards, so the caller can record
        the user as done and skip them on a later run.
    """
    user_id = _resolve_user_id(gl, target)
    if user_id is None:
        click.echo(
            f"GitLab project creation failed for '{target.username}': "
            "their GitLab user id could not be resolved."
        )
        return False
    click.echo(
        f"Creating the GitLab projects for '{target.username}'; importing the "
        "template can take a few minutes."
    )
    ok, messages = ensure_user_projects(gl, user_id, templates)
    _report_messages(target.username, messages)
    if ok:
        click.echo(
            f"GitLab projects ready for '{target.username}': "
            f"{COMMON_PROJECT_NAME} and {USER_PROJECT_NAME}."
        )
    return ok
