"""GitLab user provisioning for the DTaaS CLI.

Built on gitlab_common (vendored from lib/gitlab_common by src/pkg/build.py)
for the client, the user/PAT primitives and the two projects every user
gets, so no GitLab API code is reimplemented here. Group provisioning is not
implemented.

What is left in this package is the deployment glue: reading dtaas.toml
stops at the two resolve functions (resolve_client for the API URL and PAT,
resolve_templates for the project template), and reporting each outcome on
the console stops at provision_user_projects. Which users are provisioned
and where their tokens are persisted is pkg/users_gitlab.py's, mirroring how
dtaas_services keeps its own glue out of the shared module.
"""

from .client import resolve_client
from .projects import ProjectTarget, provision_user_projects, resolve_templates
from .provisioner import GitlabUser, ProvisionResult, ensure_user_resources

__all__ = [
    "resolve_client",
    "GitlabUser",
    "ProvisionResult",
    "ensure_user_resources",
    "ProjectTarget",
    "provision_user_projects",
    "resolve_templates",
]
