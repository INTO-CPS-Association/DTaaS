"""Creates one of a user's GitLab projects and fills it from its template.

The API calls are gitlab_common's (find_project, create_user_project) and the
git work is repos.py's; this module decides between them. A project that
already has content is never touched, and an empty one, which a failed push
leaves behind, is filled rather than reported.
"""

from dataclasses import dataclass
from enum import Enum

from ...gitlab_common import ProjectState, create_user_project, find_project
from .repos import GitAccess, TemplateCopy, copy_template


class ProjectOutcome(Enum):
    """What ensure_project did with one project."""

    CREATED = "created"
    FILLED = "filled"
    HAS_CONTENT = "has_content"
    FAILED = "failed"


@dataclass(frozen=True)
class ProjectRequest:
    """One project to provision: its owner, its name, and its template."""

    user_id: int
    username: str
    name: str
    template_url: str

    @property
    def path(self):
        """The project's full path, in the user's own namespace."""
        return f"{self.username}/{self.name}"


@dataclass(frozen=True)
class ProjectResult:
    """Outcome of ensure_project; *message* says why, for FAILED."""

    outcome: ProjectOutcome
    message: str = ""


def _left_empty(request):
    """What a failed push leaves behind, and how to finish the job."""
    return f"The project is left empty; 'dtaas user add {request.username}' fills it."


def _fill(gl, request, missing):
    """Create the project when *missing*, then push its template into it."""
    error = create_user_project(gl, request.user_id, request.name)[1] if missing else ""
    if error:
        return ProjectResult(ProjectOutcome.FAILED, error)
    copy = TemplateCopy(request.template_url, request.path)
    error = copy_template(GitAccess.from_client(gl), copy)
    if error:
        return ProjectResult(ProjectOutcome.FAILED, f"{error}\n{_left_empty(request)}")
    return ProjectResult(ProjectOutcome.CREATED if missing else ProjectOutcome.FILLED)


def ensure_project(gl, request) -> ProjectResult:
    """Make sure *request*'s project exists and holds its template.

    A missing project is created empty and private, then filled; an empty
    one is filled; one with content is left as it is (HAS_CONTENT). The push
    authenticates with the admin token *gl* was built with.
    """
    lookup = find_project(gl, request.path)
    if lookup.state is ProjectState.FAILED:
        return ProjectResult(ProjectOutcome.FAILED, lookup.error)
    if lookup.state is ProjectState.HAS_CONTENT:
        return ProjectResult(ProjectOutcome.HAS_CONTENT)
    return _fill(gl, request, lookup.state is ProjectState.MISSING)
