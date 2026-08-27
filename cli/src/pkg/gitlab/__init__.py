"""GitLab user provisioning for the DTaaS CLI.

Built on gitlab_common (vendored from lib/gitlab_common by src/pkg/build.py)
for the client and user/PAT primitives, so no GitLab client or idempotency
code is reimplemented here. Scoped to what gitlab_common currently provides:
user creation and Personal Access Token issuance. Group/project provisioning
is not implemented -- it would require new primitives in gitlab_common.

Deployment-specific glue (resolving the API URL/PAT from dtaas.toml, and
persisting issued tokens) lives in pkg/users.py, mirroring how
dtaas_services keeps that glue out of the shared module.
"""

from .client import resolve_client
from .provisioner import GitlabUser, ProvisionResult, ensure_user_resources

__all__ = ["resolve_client", "GitlabUser", "ProvisionResult", "ensure_user_resources"]
