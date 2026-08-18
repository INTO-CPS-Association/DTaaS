"""dtaas_gitlab: reusable python-gitlab operations for DTaaS.

Thin, provider-agnostic helpers shared by dtaas-services and the DTaaS CLI.
Each function takes explicit arguments (URL, token, user fields) and performs
no environment, filesystem, or console I/O -- that glue stays in the consuming
application.
"""

from .client import get_gitlab_client
from .users import create_user, create_user_pat
from .validators import validate_user_row

__all__ = [
    "get_gitlab_client",
    "create_user",
    "create_user_pat",
    "validate_user_row",
]
