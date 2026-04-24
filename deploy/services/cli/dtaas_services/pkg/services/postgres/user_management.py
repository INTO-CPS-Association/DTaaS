"""PostgreSQL user management."""

import psycopg
from psycopg import errors as pg_errors
from psycopg.sql import SQL, Composable, Identifier, Literal

from ...config import Config
from ...utils import (
    process_credentials_file,
    create_users_from_credentials,
)

_ALREADY_EXISTS = (pg_errors.DuplicateObject, pg_errors.DuplicateDatabase)


def _get_conninfo() -> str:
    """Build a psycopg3 connection info string from config."""
    config = Config()
    host = config.get_value("HOSTNAME")
    port = config.get_value("POSTGRES_PORT")
    user = config.get_value("POSTGRES_USER")
    password = config.get_value("POSTGRES_PASSWORD")
    return f"host={host} port={port} user={user} password={password} dbname=postgres"


def _execute_ddl(conninfo: str, composed: Composable) -> tuple[bool, str]:
    """Execute a single DDL statement via psycopg3 in autocommit mode.

    Uses psycopg3 so identifiers and literals are always driver-escaped,
    preventing injection. Autocommit is required because CREATE DATABASE
    cannot run inside a transaction block.
    """
    try:
        with psycopg.connect(conninfo, autocommit=True) as conn:
            conn.execute(composed)
        return True, ""
    except _ALREADY_EXISTS:
        return True, ""
    except Exception as exc:
        return False, str(exc)


def _add_postgres_user(username: str, password: str) -> tuple[bool, str]:
    """Add a PostgreSQL role and a matching database owned by that role."""
    conninfo = _get_conninfo()

    ok, err = _execute_ddl(
        conninfo,
        SQL("CREATE USER {u} WITH PASSWORD {p}").format(
            u=Identifier(username), p=Literal(password)
        ),
    )
    if not ok:
        return False, f"Failed to create user {username}: {err}"

    ok, err = _execute_ddl(
        conninfo,
        SQL("CREATE DATABASE {db} OWNER {u}").format(
            db=Identifier(username), u=Identifier(username)
        ),
    )
    if not ok:
        return False, f"Failed to create database {username}: {err}"
    return True, ""


def setup_postgres_users() -> tuple[bool, str]:
    """Add users to PostgreSQL from the credentials file."""
    return process_credentials_file(
        lambda creds_file: create_users_from_credentials(
            creds_file, _add_postgres_user
        ),
        "PostgreSQL",
        "PostgreSQL users created successfully",
    )
