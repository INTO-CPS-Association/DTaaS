"""Provider-agnostic GitLab operations shared across DTaaS packages.

Every function here takes explicit arguments (URL, token, user fields) and
reads no configuration, environment or credential file of its own, so it is
reused unchanged by both consumers. The API calls (client, users, tokens,
projects) change no process-global state. The project step's git work
(git_run, template_checks, repos, project_fill) runs git on this host in a
temporary folder, and is shared too, so both consumers fill projects with
the same safeguards. Deployment-specific glue (URL derivation, token
persistence, credential files, docker, terminal output) lives in each
consumer instead: ``dtaas_services.pkg.services.gitlab`` and the DTaaS
CLI's ``pkg.gitlab``.
"""

from .client import get_gitlab_client
from .git_run import git_problem
from .messages import with_hint
from .project_fill import (
    ProjectOutcome,
    ProjectRequest,
    ProjectResult,
    ensure_project,
)
from .projects import (
    ProjectLookup,
    ProjectState,
    create_user_project,
    find_user_project,
)
from .templates import (
    PROJECT_TEMPLATES,
    TemplateKeys,
    template_errors,
    template_urls,
)
from .users import (
    CreateOutcome,
    CreateUserResult,
    PatOptions,
    create_user,
    create_user_pat,
    find_user_id,
    revoke_user_pats,
)
from .validators import is_http_url, is_namespace_path, validate_user_row

__all__ = [
    "get_gitlab_client",
    "with_hint",
    "create_user",
    "create_user_pat",
    "find_user_id",
    "revoke_user_pats",
    "find_user_project",
    "create_user_project",
    "ensure_project",
    "git_problem",
    "template_errors",
    "template_urls",
    "validate_user_row",
    "is_http_url",
    "is_namespace_path",
    "CreateOutcome",
    "CreateUserResult",
    "PatOptions",
    "ProjectLookup",
    "ProjectState",
    "ProjectOutcome",
    "ProjectRequest",
    "ProjectResult",
    "TemplateKeys",
    "PROJECT_TEMPLATES",
]
