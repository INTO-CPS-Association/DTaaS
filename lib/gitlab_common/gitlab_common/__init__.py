"""Provider-agnostic GitLab operations shared across DTaaS packages.

Every function here takes explicit arguments (URL, token, user fields) and
reads no configuration, environment or credential file of its own, so it is
reused unchanged by both consumers. The API calls (client, users, tokens,
projects, push_token) change no process-global state. The project step's
git work (git_run, template_checks, repos, project_fill) runs git on this
host in a temporary folder, and is shared too, so both consumers fill
projects with the same safeguards. project_run words each project's
outcome and decides which are recorded, the same for both, and hands the
printing and the saving back to the consumer. Deployment-specific glue (URL
derivation, token persistence, credential files, docker, terminal output)
lives in each consumer instead: ``dtaas_services.pkg.services.gitlab`` and
the DTaaS CLI's ``pkg.gitlab``.
"""

from .client import get_gitlab_client
from .errors import describe_api_error
from .git_run import git_problem
from .messages import with_hint
from .project_fill import (
    ProjectOutcome,
    ProjectRequest,
    ProjectResult,
    ensure_project,
)
from .project_run import (
    NoticeLevel,
    ProjectHooks,
    ProjectNotice,
    ensure_projects,
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
from .tokens import PatOptions, create_user_pat, revoke_user_pats
from .users import (
    CreateOutcome,
    CreateUserResult,
    UserInfo,
    create_user,
    find_user,
)
from .validators import (
    is_commit_id,
    is_http_url,
    is_https_url,
    is_namespace_path,
    validate_user_row,
)

__all__ = [
    "get_gitlab_client",
    "describe_api_error",
    "with_hint",
    "create_user",
    "create_user_pat",
    "find_user",
    "revoke_user_pats",
    "find_user_project",
    "create_user_project",
    "ensure_project",
    "ensure_projects",
    "git_problem",
    "template_errors",
    "template_urls",
    "validate_user_row",
    "is_commit_id",
    "is_http_url",
    "is_https_url",
    "is_namespace_path",
    "CreateOutcome",
    "CreateUserResult",
    "PatOptions",
    "UserInfo",
    "ProjectLookup",
    "ProjectState",
    "ProjectOutcome",
    "ProjectRequest",
    "ProjectResult",
    "ProjectHooks",
    "ProjectNotice",
    "NoticeLevel",
    "TemplateKeys",
    "PROJECT_TEMPLATES",
]
