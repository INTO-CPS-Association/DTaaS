"""Creates one GitLab project for a user, imported from a template repository.

The project counterpart of users.py, and shaped like it: the GitLab API work
for a single resource, taking explicit arguments and doing no console
output, config reading or persistence. Which projects a user gets is
user_projects.py's answer; where the template comes from is each consumer's.

The project is created in the user's own namespace with GitLab's import by
URL feature, which copies the template repository as it stands: every branch
comes across and the template's own default branch stays the default. One
template repository per project, so nothing has to be pruned afterwards.

The import runs asynchronously and has instance side prerequisites, both of
which project_import.py handles: the project exists before its repository
does, so the import is awaited before the project is reported as ready.
"""

import logging
from dataclasses import dataclass

import gitlab
import gitlab.exceptions

from .errors import API_ERRORS
from .messages import with_hint
from .project_import import IMPORT_TIMEOUT_MINUTES, await_import

logger = logging.getLogger(__name__)

# Created projects are private: they hold one user's workspace, and the
# template's own visibility is not inherited by an import.
PROJECT_VISIBILITY = "private"

NO_IMPORT_TO_AWAIT = with_hint(
    "The project exists but is empty, with no import to await.",
    "Delete it in GitLab and re-run to create it from the template.",
)


@dataclass(frozen=True)
class ProjectSpec:
    """One project to create: its name, the template repository to import it
    from, and how long that import may take before the wait is given up on."""

    name: str
    import_url: str
    import_timeout: int = IMPORT_TIMEOUT_MINUTES


@dataclass(frozen=True)
class ProjectResult:
    """Outcome of :func:`create_user_project`, shaped like users.py's
    CreateUserResult: *ok* means the project is there now, whether or not
    this call created it, and *already_exists* tells the two apart.
    """

    ok: bool
    project_id: int | None = None
    error: str = ""
    already_exists: bool = False


def _existing_project(gl: gitlab.Gitlab, namespace: str, name: str):
    """The project ``namespace/name`` when it already exists, else None.

    Only a 404 means the project is not there. Any other refusal (a 403 from
    a token that may not read the namespace, a 500 from an instance in
    trouble) is raised for the caller to report: reading it as "absent"
    would send the run on to create a project that may well exist, and would
    hide the permission problem behind whatever the creation then answers.
    """
    try:
        return gl.projects.get(f"{namespace}/{name}")
    except gitlab.exceptions.GitlabGetError as exc:
        if exc.response_code == 404:
            return None
        raise


def _is_empty(project) -> bool:
    """True when *project* has no repository content yet, which is what an
    import that is still running, failed or never started leaves behind."""
    empty = bool(getattr(project, "empty_repo", False))
    return empty or not getattr(project, "default_branch", "")


def _seed_project(gl: gitlab.Gitlab, project_id: int, spec: ProjectSpec):
    """Wait for *project_id*'s import of *spec*'s template to finish.

    Nothing else is done to the repository: it is a copy of the template as
    the template stands, branches and default branch included.
    """
    _project, error = await_import(gl, project_id, spec.import_timeout)
    if error:
        return ProjectResult(False, project_id=project_id, error=error)
    return ProjectResult(True, project_id=project_id)


def _adopt_existing(gl: gitlab.Gitlab, project, spec: ProjectSpec) -> ProjectResult:
    """Report a project the user already owns, or finish seeding it.

    Only a project with no repository is seeded: that is what a run leaves
    when it stopped waiting on an import, and reporting it as ready would
    mark the user done with an empty repository. A project with any content
    is never touched, since its branches may hold the user's own work.
    """
    if not _is_empty(project):
        logger.info("GitLab project exists: %s", project.path_with_namespace)
        return ProjectResult(True, project_id=project.id, already_exists=True)
    if getattr(project, "import_status", "none") == "none":
        return ProjectResult(False, project_id=project.id, error=NO_IMPORT_TO_AWAIT)
    logger.info("Resuming the seeding of %s", project.path_with_namespace)
    return _seed_project(gl, project.id, spec)


def _lookup_project(gl: gitlab.Gitlab, user_id: int, spec: ProjectSpec):
    """The account and its copy of *spec*'s project, when it has one.

    Returns:
        Tuple of (user, existing_project, error). *existing_project* is None
        when the account has no project of that name, and *error* is set when
        GitLab refused either read, which is reported as a lookup failure
        rather than as a creation that was never attempted.
    """
    try:
        user = gl.users.get(user_id)
        return user, _existing_project(gl, user.username, spec.name), ""
    except API_ERRORS as exc:
        return None, None, f"could not look up project '{spec.name}': {exc}"


def _create_project(user, spec: ProjectSpec):
    """Create *spec*'s project in *user*'s own namespace.

    This is GitLab's admin only "create project for user" endpoint, which
    runs the creation as *user*: it needs an administrator token, and it is
    refused when the account itself may not create projects (a default
    projects limit of 0 is the usual cause).

    Returns:
        Tuple of (project, error).
    """
    try:
        project = user.projects.create(
            {
                "name": spec.name,
                "import_url": spec.import_url,
                "visibility": PROJECT_VISIBILITY,
            }
        )
        return project, ""
    except API_ERRORS as exc:
        return None, f"could not create project '{spec.name}': {exc}"


def _user_project(gl: gitlab.Gitlab, user_id: int, spec: ProjectSpec):
    """The project *spec* asks for in *user_id*'s namespace, creating it when
    it is not there yet.

    Returns:
        Tuple of (project, created, error); *created* tells a fresh import
        from a project that was already in the namespace, and *error* is set
        when GitLab refused the lookup or the creation.
    """
    user, existing, error = _lookup_project(gl, user_id, spec)
    if error or existing is not None:
        return existing, False, error
    created, error = _create_project(user, spec)
    return created, created is not None, error


def create_user_project(
    gl: gitlab.Gitlab, user_id: int, spec: ProjectSpec
) -> ProjectResult:
    """Create *spec*'s project in *user_id*'s namespace from its template.

    Idempotent: a project of that name already in the user's namespace keeps
    its contents, so a repeated run never overwrites a user's work. An empty
    one, left by an earlier run whose import had not finished, is waited on
    here rather than reported as ready; an import that failed is reported
    with the way to retry it, since GitLab does not rerun it.

    Args:
        gl: Authenticated gitlab.Gitlab client with admin rights.
        user_id: GitLab id of the account the project is created for.
        spec: Project name and the template repository to import.

    Returns:
        A :class:`ProjectResult`. A project whose import did not finish is
        not ok, with its id set, so the caller can report which project
        needs attention.
    """
    project, created, error = _user_project(gl, user_id, spec)
    if project is None:
        return ProjectResult(False, error=error)
    if created:
        return _seed_project(gl, project.id, spec)
    return _adopt_existing(gl, project, spec)
