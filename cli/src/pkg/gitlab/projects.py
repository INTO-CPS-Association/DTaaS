"""Creates one of a user's GitLab projects and fills it from its template.

The API calls are gitlab_common's (find_user_project, create_user_project)
and the git work is repos.py's; this module decides between them. Only a
project created by this call is filled: one that already exists, empty or
not, is never pushed to, since its settings (a CI configuration path,
webhooks) are its owner's. The template is cloned before the project is
created, so an unusable template leaves nothing behind; the push goes to
the path GitLab reports for the project, as the user, with their own token.
"""

from dataclasses import dataclass, field
from enum import Enum

from ...gitlab_common import ProjectState, create_user_project, find_user_project
from .repos import GitAccess, cloned_template


class ProjectOutcome(Enum):
    """What ensure_project did with one project."""

    CREATED = "created"
    EMPTY = "empty"
    HAS_CONTENT = "has_content"
    FAILED = "failed"


# A project found in the user's namespace is reported, never touched.
_FOUND = {
    ProjectState.EMPTY: ProjectOutcome.EMPTY,
    ProjectState.HAS_CONTENT: ProjectOutcome.HAS_CONTENT,
    ProjectState.FAILED: ProjectOutcome.FAILED,
}


@dataclass(frozen=True)
class ProjectRequest:
    """One project to provision: its owner, its name, its template, and the
    owner's own token, which the push authenticates with."""

    user_id: int
    username: str
    name: str
    template_url: str
    token: str = field(repr=False)

    @property
    def path(self):
        """The project's path as the DTaaS user names it, for messages."""
        return f"{self.username}/{self.name}"


@dataclass(frozen=True)
class ProjectResult:
    """Outcome of ensure_project; *message* says why, for FAILED."""

    outcome: ProjectOutcome
    message: str = ""


def _push_failed(request):
    """Who the push ran as, what it leaves behind, and how to finish."""
    user = request.username
    return (
        f"The push uses {user}'s own GitLab token. If GitLab refused it, "
        f"{user} may first have to sign in and set a new password, or the "
        "token was revoked.\n"
        "The project is left empty: delete it, then run "
        f"'dtaas user add {user}' again."
    )


def _create_and_push(gl, request, clone):
    """Create the project, then push *clone* into it as the user; "" or why
    it failed."""
    created, path_or_error = create_user_project(gl, request.user_id, request.name)
    if not created:
        return path_or_error
    error = clone.push(path_or_error, request.token)
    return f"{error}\n{_push_failed(request)}" if error else ""


def _create_from_template(gl, request):
    """Clone the template, then create the project and push the clone."""
    with cloned_template(GitAccess.from_client(gl), request.template_url) as clone:
        error = clone.error or _create_and_push(gl, request, clone)
    if error:
        return ProjectResult(ProjectOutcome.FAILED, error)
    return ProjectResult(ProjectOutcome.CREATED)


def ensure_project(gl, request) -> ProjectResult:
    """Make sure *request*'s project exists, filled from its template when
    this call creates it.

    The project is looked up among the projects of the GitLab user id. A
    missing one is created private and filled (CREATED); one that exists is
    left as it is (EMPTY or HAS_CONTENT). *gl*, the admin client, makes the
    API calls; the push authenticates with the user's own token
    (request.token) and starts no CI pipeline.
    """
    lookup = find_user_project(gl, request.user_id, request.name)
    if lookup.state is ProjectState.MISSING:
        return _create_from_template(gl, request)
    return ProjectResult(_FOUND[lookup.state], lookup.error)
