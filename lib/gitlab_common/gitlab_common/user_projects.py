"""The two repositories every DTaaS user's workspace starts from.

A DTaaS user gets a ``common`` project and a ``user`` project in their own
GitLab namespace, each imported from its own template repository. That
pairing is the same wherever users are provisioned from, so it lives here
rather than in one consumer, while where the templates come from stays with
each consumer: the CLI reads them from dtaas.toml.

Like the rest of this package the work is done through explicit arguments
and reported back as values: outcomes come out as message strings for the
caller to print, log or ignore.
"""

from dataclasses import dataclass

from .project_import import IMPORT_TIMEOUT_MINUTES
from .projects import ProjectSpec, create_user_project

COMMON_PROJECT_NAME = "common"
USER_PROJECT_NAME = "user"


@dataclass(frozen=True)
class ProjectTemplates:
    """The repository each of the two projects is imported from, and how long
    one import may take before it is given up on."""

    common_url: str
    user_url: str
    import_timeout: int = IMPORT_TIMEOUT_MINUTES


def project_specs(templates: ProjectTemplates):
    """The two projects every provisioned user gets, in creation order."""
    timeout = templates.import_timeout
    return [
        ProjectSpec(COMMON_PROJECT_NAME, templates.common_url, timeout),
        ProjectSpec(USER_PROJECT_NAME, templates.user_url, timeout),
    ]


MESSAGE_FAILURE = "failure"
MESSAGE_WARNING = "warning"


@dataclass(frozen=True)
class ProjectMessage:
    """One line to report about a project, and how serious it is, so a
    consumer can label it without parsing the text."""

    level: str
    text: str


def _describe(spec, result) -> ProjectMessage | None:
    """The line to report for one project's outcome, or None when there is
    nothing to say: a cleanly created project is summarised by the caller.

    A project that was already in the namespace is a warning rather than a
    failure: it is left exactly as it was, so the run carries on, but the
    admin is told that this user's repository is not the one the template
    would have produced.
    """
    if not result.ok:
        return ProjectMessage(
            MESSAGE_FAILURE, f"project '{spec.name}' failed: {result.error}"
        )
    if result.already_exists:
        return ProjectMessage(
            MESSAGE_WARNING,
            f"project '{spec.name}' already exists, so it was not created; "
            "its contents were left unchanged",
        )
    return None


def ensure_user_projects(gl, user_id: int, templates: ProjectTemplates):
    """Create the common and user projects for the account *user_id*.

    Idempotent through projects.create_user_project: a project the user
    already owns keeps its contents and is never re-imported, and an empty
    one an earlier run left waiting on its import is finished. Both projects
    are attempted even when the first one fails, so a single unreachable
    template does not hide a second problem.

    Args:
        gl: Authenticated gitlab.Gitlab client with admin rights.
        user_id: GitLab id of the account the projects are created for.
        templates: The template repository for each of the two projects.

    Returns:
        Tuple of (ok, messages); *ok* is True when both projects exist
        afterwards, and *messages* are :class:`ProjectMessage` items to
        report for this user, each carrying its own level.
    """
    outcomes = [
        (spec, create_user_project(gl, user_id, spec))
        for spec in project_specs(templates)
    ]
    lines = (_describe(spec, result) for spec, result in outcomes)
    messages = tuple(line for line in lines if line is not None)
    return all(result.ok for _, result in outcomes), messages
