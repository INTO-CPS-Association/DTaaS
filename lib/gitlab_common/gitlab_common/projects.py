"""GitLab project provisioning: look up a user's project, create one for them.

Only the API half lives here. Filling a new project from a template (git
clone and push) touches the filesystem and runs processes, so it stays in
each consuming application, like every other kind of I/O.

Both functions address the user by GitLab user id and return the project's
``path_with_namespace`` as GitLab reports it, so a caller never builds a
project path from a username that may not match the account.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Tuple

import gitlab

from .errors import API_ERRORS

PRIVATE = "private"


class ProjectState(Enum):
    """What ``find_user_project`` found in a user's namespace."""

    MISSING = "missing"
    EMPTY = "empty"
    HAS_CONTENT = "has_content"
    FAILED = "failed"


@dataclass(frozen=True)
class ProjectLookup:
    """Outcome of ``find_user_project``. ``path`` is GitLab's
    ``path_with_namespace`` for a project found (EMPTY, HAS_CONTENT);
    ``error`` is set only for FAILED."""

    state: ProjectState
    error: str = ""
    path: str = ""


def _state_of(project) -> ProjectState:
    """EMPTY only when GitLab says the repository is empty (``empty_repo``)."""
    if getattr(project, "empty_repo", False) is True:
        return ProjectState.EMPTY
    return ProjectState.HAS_CONTENT


def find_user_project(gl: gitlab.Gitlab, user_id: int, name: str) -> ProjectLookup:
    """Look up the project whose path is *name* in the namespace of *user_id*.

    Lists the user's own projects (``GET /users/:user_id/projects``), so the
    namespace is the account's, whatever its username. A project whose state
    GitLab does not report counts as having content, so a caller never
    pushes into a repository it cannot see. An unknown user id is FAILED.

    Args:
        gl: Authenticated gitlab.Gitlab client, owned by an administrator.
        user_id: GitLab user ID of the namespace owner.
        name: Path of the project inside that namespace, for example ``common``.

    Returns:
        A :class:`ProjectLookup`.
    """
    try:
        listed = gl.users.get(user_id, lazy=True).projects.list(
            search=name, iterator=True
        )
        project = next((found for found in listed if found.path == name), None)
    except API_ERRORS as exc:
        return ProjectLookup(
            ProjectState.FAILED,
            f"Failed to look up project '{name}' of GitLab user {user_id}: {exc}",
        )
    if project is None:
        return ProjectLookup(ProjectState.MISSING)
    return ProjectLookup(_state_of(project), path=project.path_with_namespace)


def create_user_project(gl: gitlab.Gitlab, user_id: int, name: str) -> Tuple[bool, str]:
    """Create an empty private project *name* in the namespace of *user_id*.

    Uses the administrator endpoint ``POST /projects/user/:user_id``, so the
    user owns the project. No ``import_url`` is sent: the repository starts
    empty, for the caller to push into.

    Args:
        gl: Authenticated gitlab.Gitlab client, owned by an administrator.
        user_id: GitLab user ID of the namespace owner.
        name: Name and path of the project.

    Returns:
        Tuple of (success, path_or_error): the new project's
        ``path_with_namespace`` on success, else why it failed.
    """
    try:
        project = gl.users.get(user_id, lazy=True).projects.create(
            {"name": name, "path": name, "visibility": PRIVATE}
        )
        return True, project.path_with_namespace
    except API_ERRORS as exc:
        return (
            False,
            f"Failed to create project '{name}' for GitLab user {user_id}: {exc}",
        )
