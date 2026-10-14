"""Provider-agnostic GitLab operations shared across DTaaS packages.

Every function here takes explicit arguments (URL, token, user fields) and
performs no environment, filesystem, console, or process-global state
changes, so it is reused unchanged by both consumers. Deployment-specific
glue URL derivation, token persistence, credential files, docker, and
terminal output lives in each consumer instead: ``dtaas_services.pkg.
services.gitlab`` and the DTaaS CLI's ``pkg.gitlab``.
"""

from .client import get_gitlab_client
from .messages import with_hint
from .users import (
    CreateOutcome,
    CreateUserResult,
    PatOptions,
    create_user,
    create_user_pat,
    revoke_user_pats,
)
from .validators import validate_user_row

__all__ = [
    "get_gitlab_client",
    "with_hint",
    "create_user",
    "create_user_pat",
    "revoke_user_pats",
    "validate_user_row",
    "CreateOutcome",
    "CreateUserResult",
    "PatOptions",
]
