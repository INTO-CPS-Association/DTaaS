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
import re
import psycopg
from psycopg import sql
from psycopg import errors as pg_errors
from ..config import Config

# PostgreSQL's own default for scram_iterations. Every login of the role
# pays for the iterations, so a higher count is the operator's choice in
# POSTGRES_SCRAM_ITERATIONS and never lower than the server's default.
DEFAULT_SCRAM_ITERATIONS = 4096
# The PostgreSQL of the services always runs with ssl=on, and the Grafana
# data sources already require TLS, so every other client does too.
DEFAULT_SSLMODE = "require"
SSLMODES = ("disable", "allow", "prefer", "require", "verify-ca", "verify-full")
# Where Telegraf and Grafana reach PostgreSQL inside the Docker network
DEFAULT_INTERNAL_HOST = "postgres"
DEFAULT_INTERNAL_PORT = "5432"
# A host name ends up inside a libpq connection string, so no space or quote
HOST_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$")


def scram_iterations(config: Config) -> int:
    """The SCRAM iteration count of POSTGRES_SCRAM_ITERATIONS, or the default."""
    value = config.env.get("POSTGRES_SCRAM_ITERATIONS") or str(DEFAULT_SCRAM_ITERATIONS)
    if not value.isdigit() or int(value) < DEFAULT_SCRAM_ITERATIONS:
        raise ValueError(
            "POSTGRES_SCRAM_ITERATIONS must be a whole number "
            f"of at least {DEFAULT_SCRAM_ITERATIONS}"
        )
    return int(value)


def sslmode(config: Config) -> str:
    """The libpq sslmode of POSTGRES_SSLMODE, or require."""
    value = config.env.get("POSTGRES_SSLMODE") or DEFAULT_SSLMODE
    if value not in SSLMODES:
        raise ValueError(f"POSTGRES_SSLMODE must be one of {', '.join(SSLMODES)}")
    return value


def internal_address(config: Config) -> tuple[str, str]:
    """Host and port of PostgreSQL inside the Docker network."""
    host = config.env.get("POSTGRES_INTERNAL_HOST") or DEFAULT_INTERNAL_HOST
    port = config.env.get("POSTGRES_INTERNAL_PORT") or DEFAULT_INTERNAL_PORT
    if not HOST_PATTERN.match(host):
        raise ValueError(f"Invalid POSTGRES_INTERNAL_HOST: {host!r}")
    if not port.isdigit() or not 0 < int(port) < 65536:
        raise ValueError(f"Invalid POSTGRES_INTERNAL_PORT: {port!r}")
    return host, port


def connect(dbname: str, autocommit: bool = False) -> psycopg.Connection:
    """Connect as the administrator of services.env to one database."""
    config = Config()
    return psycopg.connect(
        host=config.get_value("HOSTNAME"),
        port=config.get_value("POSTGRES_PORT"),
        user=config.get_value("POSTGRES_USER"),
        password=config.get_value("POSTGRES_PASSWORD"),
        dbname=dbname,
        sslmode=sslmode(config),
        autocommit=autocommit,
    )


def scram_verifier(password: str, iterations: int = DEFAULT_SCRAM_ITERATIONS) -> str:
    """Return the SCRAM-SHA-256 verifier that PostgreSQL stores for a password.

    The format is the one of RFC 5803, which PostgreSQL accepts in place of
    a plain password in CREATE ROLE and ALTER ROLE.
    """
    salt = os.urandom(16)
    salted = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    stored_key = hashlib.sha256(client_key).digest()
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()

    def b64(data: bytes) -> str:
        return base64.b64encode(data).decode("ascii")

    return (
        f"SCRAM-SHA-256${iterations}:{b64(salt)}"
        f"${b64(stored_key)}:{b64(server_key)}"
    )


def ensure_login_role(conn: psycopg.Connection, role: str, password: str) -> None:
    """Create a login role, or set its password when it exists."""
    iterations = scram_iterations(Config())
    exists = conn.execute(
        "SELECT 1 FROM pg_roles WHERE rolname = %s", (role,)
    ).fetchone()
    verb = "ALTER" if exists else "CREATE"
    conn.execute(
        sql.SQL(verb + " ROLE {} WITH LOGIN PASSWORD {}").format(
            sql.Identifier(role), sql.Literal(scram_verifier(password, iterations))
        )
    )


def ensure_database(name: str) -> None:
    """Create a database owned by the administrator when it is missing.

    CREATE DATABASE cannot run inside a transaction, so this uses its own
    connection in autocommit mode.
    """
    with connect("postgres", autocommit=True) as conn:
        try:
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
        except pg_errors.DuplicateDatabase:
            pass
