"""GitLab user provisioning for the DTaaS CLI.

Built on gitlab_common (vendored from lib/gitlab_common by src/pkg/build.py)
for the client and the user, PAT and project primitives, so no GitLab API
code is reimplemented here. Group provisioning is not implemented.

What is left in this package is the deployment glue: reading dtaas.toml
stops at resolve_client (the API URL and PAT), and reporting each account
outcome stops at ensure_user_resources (and revoke_issued_tokens for
'user delete'). ensure_project, which creates a user's project and fills it
from its template with git, and git_problem are gitlab_common's, shared with
dtaas-services, and re-exported here. Which users are provisioned and where
their tokens and markers are persisted is pkg/users_gitlab.py's, mirroring
how dtaas_services keeps its own glue out of the shared module.
"""

from ...gitlab_common import (
    ProjectOutcome,
    ProjectRequest,
    ProjectResult,
    ensure_project,
    git_problem,
)
from .client import resolve_client
from .provisioner import (
    GitlabUser,
    ProvisionResult,
    ensure_user_resources,
    revoke_issued_tokens,
)

__all__ = [
    "resolve_client",
    "GitlabUser",
    "ProvisionResult",
    "ensure_user_resources",
    "revoke_issued_tokens",
    "ProjectOutcome",
    "ProjectRequest",
    "ProjectResult",
    "ensure_project",
    "git_problem",
]
