"""Provider-agnostic GitLab operations shared across DTaaS packages.

Every function here takes explicit arguments (URL, token, user fields) and
performs no environment, filesystem, console, or process-global state changes,
so it can be reused unchanged by the DTaaS CLI. Deployment-specific glue --
URL derivation, token persistence, credential files, docker, and terminal
output -- lives in ``dtaas_services.pkg.services.gitlab``.
"""

from .client import get_gitlab_client
from .users import (
    CreateOutcome,
    CreateUserResult,
    PatOptions,
    create_user,
    create_user_pat,
)
from .validators import validate_user_row

__all__ = [
    "get_gitlab_client",
    "create_user",
    "create_user_pat",
    "validate_user_row",
    "CreateOutcome",
    "CreateUserResult",
    "PatOptions",
]
