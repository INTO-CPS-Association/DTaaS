"""GitLab project provisioning: look up a project, create one for a user.

Only the API half lives here. Filling a new project from a template (git
clone and push) touches the filesystem and runs processes, so it stays in
each consuming application, like every other kind of I/O.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Tuple

import gitlab

from .errors import API_ERRORS

PRIVATE = "private"


class ProjectState(Enum):
    """What ``find_project`` found at a project path."""

    MISSING = "missing"
    EMPTY = "empty"
    HAS_CONTENT = "has_content"
    FAILED = "failed"


@dataclass(frozen=True)
class ProjectLookup:
    """Outcome of ``find_project``; ``error`` is set only for FAILED."""

    state: ProjectState
    error: str = ""


def _lookup_failure(path, exc) -> ProjectLookup:
    """MISSING for a 404, else FAILED with GitLab's own words."""
    if getattr(exc, "response_code", None) == 404:
        return ProjectLookup(ProjectState.MISSING)
    return ProjectLookup(
        ProjectState.FAILED, f"Failed to look up project '{path}': {exc}"
    )


def find_project(gl: gitlab.Gitlab, path: str) -> ProjectLookup:
    """Look up the project at *path* (``namespace/project``).

    A project is EMPTY only when GitLab says its repository is empty
    (``empty_repo``); one whose state it does not report counts as having
    content, so a caller never pushes into a repository it cannot see.

    Args:
        gl: Authenticated gitlab.Gitlab client.
        path: Full path of the project, for example ``alice/common``.

    Returns:
        A :class:`ProjectLookup`.
    """
    try:
        project = gl.projects.get(path)
    except API_ERRORS as exc:
        return _lookup_failure(path, exc)
    if getattr(project, "empty_repo", False) is True:
        return ProjectLookup(ProjectState.EMPTY)
    return ProjectLookup(ProjectState.HAS_CONTENT)


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
        Tuple of (success, error); *error* is empty on success.
    """
    try:
        gl.users.get(user_id, lazy=True).projects.create(
            {"name": name, "path": name, "visibility": PRIVATE}
        )
        return True, ""
    except API_ERRORS as exc:
        return (
            False,
            f"Failed to create project '{name}' for GitLab user {user_id}: {exc}",
        )
