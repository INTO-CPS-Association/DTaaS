"""Provider-agnostic GitLab operations shared across DTaaS packages.

Every function here takes explicit arguments (URL, token, user fields) and
performs no environment, filesystem, console, or process-global state
changes, so it is reused unchanged by both consumers. Deployment-specific
glue URL derivation, token persistence, credential files, docker, and
terminal output lives in each consumer instead: ``dtaas_services.pkg.
services.gitlab`` and the DTaaS CLI's ``pkg.gitlab``.

That split is what decides where the project code sits too: creating a
user's projects from a template repository is here, while reading the
template out of a deployment's own configuration is each consumer's.
"""

from .client import get_gitlab_client
from .project_import import IMPORT_TIMEOUT_MINUTES, await_import, import_state
from .projects import ProjectResult, ProjectSpec, create_user_project
from .user_projects import (
    COMMON_PROJECT_NAME,
    MESSAGE_FAILURE,
    MESSAGE_WARNING,
    USER_PROJECT_NAME,
    ProjectMessage,
    ProjectTemplates,
    ensure_user_projects,
    project_specs,
)
from .users import (
    CreateOutcome,
    CreateUserResult,
    PatOptions,
    create_user,
    create_user_pat,
    find_user_id,
)
from .validators import validate_user_row

__all__ = [
    "get_gitlab_client",
    "create_user",
    "create_user_pat",
    "find_user_id",
    "validate_user_row",
    "CreateOutcome",
    "CreateUserResult",
    "PatOptions",
    "create_user_project",
    "ProjectSpec",
    "ProjectResult",
    "IMPORT_TIMEOUT_MINUTES",
    "await_import",
    "import_state",
    "ensure_user_projects",
    "project_specs",
    "ProjectTemplates",
    "ProjectMessage",
    "MESSAGE_FAILURE",
    "MESSAGE_WARNING",
    "COMMON_PROJECT_NAME",
    "USER_PROJECT_NAME",
]
