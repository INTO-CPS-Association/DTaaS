"""PostgreSQL user management."""

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from psycopg import errors as pg_errors
from psycopg.sql import SQL, Composable, Identifier, Literal

from ...config import Config
from ...utils import (
    process_credentials_file,
    create_users_from_credentials,
)

_ALREADY_EXISTS = (pg_errors.DuplicateObject, pg_errors.DuplicateDatabase)


def _get_engine() -> Engine:
    """Create a SQLAlchemy engine backed by the psycopg3 driver."""
    config = Config()
    host = config.get_value("HOSTNAME")
    port = config.get_value("POSTGRES_PORT")
    user = config.get_value("POSTGRES_USER")
    password = config.get_value("POSTGRES_PASSWORD")
    return create_engine(
        f"postgresql+psycopg://{user}:{password}@{host}:{port}/postgres"
    )


def _execute_ddl(engine: Engine, composed: Composable) -> tuple[bool, str]:
    """Execute a single DDL statement via the raw psycopg3 connection.

    Uses psycopg3 so identifiers and literals are always driver-escaped, preventing injection.
    """
    raw = engine.raw_connection()
    cur = raw.cursor()
    try:
        cur.execute(composed)
        raw.commit()
        return True, ""
    except _ALREADY_EXISTS:
        raw.rollback()
        return True, ""
    except Exception as exc:
        raw.rollback()
        return False, str(exc)
    finally:
        cur.close()
        raw.close()


def _add_postgres_user(username: str, password: str) -> tuple[bool, str]:
    """Add a PostgreSQL role and a matching database owned by that role."""
    engine = _get_engine()
    try:
        ok, err = _execute_ddl(
            engine,
            SQL("CREATE USER {u} WITH PASSWORD {p}").format(
                u=Identifier(username), p=Literal(password)
            ),
        )
        if not ok:
            return False, f"Failed to create user {username}: {err}"

        ok, err = _execute_ddl(
            engine,
            SQL("CREATE DATABASE {db} OWNER {u}").format(
                db=Identifier(username), u=Identifier(username)
            ),
        )
        if not ok:
            return False, f"Failed to create database {username}: {err}"
        return True, ""
    finally:
        engine.dispose()


def setup_postgres_users() -> tuple[bool, str]:
    """Add users to PostgreSQL from the credentials file."""
    return process_credentials_file(
        lambda creds_file: create_users_from_credentials(
            creds_file, _add_postgres_user
        ),
        "PostgreSQL",
        "PostgreSQL users created successfully",
    )
