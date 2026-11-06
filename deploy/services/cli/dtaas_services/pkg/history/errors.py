"""One message for each kind of error that setup and registration report."""

import psycopg
from .kits import KitError
from .owners import OwnersError

HANDLED = (psycopg.Error, KitError, OwnersError, OSError)


def describe(error: Exception) -> str:
    """A message that names the error without printing any secret."""
    if isinstance(error, psycopg.Error):
        return f"PostgreSQL: {type(error).__name__}: {error}"
    if isinstance(error, (KitError, OwnersError)):
        return str(error)
    return f"Cannot write a file: {type(error).__name__}"
