"""Administrator connection to PostgreSQL and the login roles it makes.

Every identifier goes through psycopg's sql.Identifier and every value is a
query parameter or a sql.Literal, so no name or value is pasted into SQL.
A role's password is sent as a SCRAM-SHA-256 verifier computed here, so the
password itself never reaches the server or its logs.
"""

import base64
import hashlib
import hmac
import os
import psycopg
from psycopg import sql
from psycopg import errors as pg_errors
from ..config import Config

SCRAM_ITERATIONS = 4096


def connect(dbname: str, autocommit: bool = False) -> psycopg.Connection:
    """Connect as the administrator of services.env to one database."""
    config = Config()
    return psycopg.connect(
        host=config.get_value("HOSTNAME"),
        port=config.get_value("POSTGRES_PORT"),
        user=config.get_value("POSTGRES_USER"),
        password=config.get_value("POSTGRES_PASSWORD"),
        dbname=dbname,
        autocommit=autocommit,
    )


def scram_verifier(password: str) -> str:
    """Return the SCRAM-SHA-256 verifier that PostgreSQL stores for a password.

    The format is the one of RFC 5803, which PostgreSQL accepts in place of
    a plain password in CREATE ROLE and ALTER ROLE.
    """
    salt = os.urandom(16)
    salted = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, SCRAM_ITERATIONS
    )
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    stored_key = hashlib.sha256(client_key).digest()
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()

    def b64(data: bytes) -> str:
        return base64.b64encode(data).decode("ascii")

    return (
        f"SCRAM-SHA-256${SCRAM_ITERATIONS}:{b64(salt)}"
        f"${b64(stored_key)}:{b64(server_key)}"
    )


def ensure_login_role(conn: psycopg.Connection, role: str, password: str) -> None:
    """Create a login role, or set its password when it exists."""
    exists = conn.execute(
        "SELECT 1 FROM pg_roles WHERE rolname = %s", (role,)
    ).fetchone()
    verb = "ALTER" if exists else "CREATE"
    conn.execute(
        sql.SQL(verb + " ROLE {} WITH LOGIN PASSWORD {}").format(
            sql.Identifier(role), sql.Literal(scram_verifier(password))
        )
    )


def ensure_database(name: str) -> None:
    """Create a database owned by the administrator when it is missing.

    CREATE DATABASE cannot run inside a transaction, so this uses its own
    connection in autocommit mode.
    """
    with connect("postgres", autocommit=True) as conn:
        try:
            conn.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name))
            )
        except pg_errors.DuplicateDatabase:
            pass
