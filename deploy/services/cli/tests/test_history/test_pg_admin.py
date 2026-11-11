"""Tests for the administrator connection and login roles"""

import base64
import hashlib
import hmac
from unittest.mock import MagicMock
import pytest
from psycopg import errors as pg_errors
from dtaas_services.pkg.history import pg_admin
from .conftest import FakeConnection


def parts(verifier: str) -> tuple[str, int, str, str]:
    """Scheme, iterations, salt and keys of an RFC 5803 verifier"""
    scheme, rest = verifier.split("$", 1)
    params, keys = rest.split("$")
    iterations, salt = params.split(":")
    return scheme, int(iterations), salt, keys


def test_scram_verifier_matches_the_rfc_5803_format():
    """The verifier holds the iterations, salt, stored key and server key"""
    scheme, iterations, salt, keys = parts(pg_admin.scram_verifier("s3cret"))
    stored_key, server_key = (base64.b64decode(k) for k in keys.split(":"))
    salted = hashlib.pbkdf2_hmac(
        "sha256", b"s3cret", base64.b64decode(salt), iterations
    )
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    assert scheme == "SCRAM-SHA-256"
    assert iterations == pg_admin.DEFAULT_SCRAM_ITERATIONS
    assert stored_key == hashlib.sha256(client_key).digest()
    assert server_key == hmac.new(salted, b"Server Key", hashlib.sha256).digest()


def test_scram_verifier_uses_a_new_salt_each_time():
    """Two verifiers of one password have different salts"""
    first = parts(pg_admin.scram_verifier("pw"))
    second = parts(pg_admin.scram_verifier("pw"))
    assert first[2] != second[2]


def test_scram_verifier_carries_the_given_iterations():
    """A raised iteration count is the one written into the verifier"""
    assert parts(pg_admin.scram_verifier("pw", 600_000))[1] == 600_000


def config_with(mocker, **env):
    """A Config whose environment holds only the given values"""
    config = mocker.Mock()
    config.env = env
    return config


def test_settings_default_to_postgresql_and_the_compose_file(mocker):
    """Without settings: 4096 iterations, TLS required, postgres:5432"""
    config = config_with(mocker)
    assert pg_admin.scram_iterations(config) == 4096
    assert pg_admin.sslmode(config) == "require"
    assert pg_admin.internal_address(config) == ("postgres", "5432")


def test_settings_read_services_env(mocker):
    """Each setting of services.env replaces its default"""
    config = config_with(
        mocker,
        POSTGRES_SCRAM_ITERATIONS="600000",
        POSTGRES_SSLMODE="verify-full",
        POSTGRES_INTERNAL_HOST="db.internal",
        POSTGRES_INTERNAL_PORT="6432",
    )
    assert pg_admin.scram_iterations(config) == 600_000
    assert pg_admin.sslmode(config) == "verify-full"
    assert pg_admin.internal_address(config) == ("db.internal", "6432")


@pytest.mark.parametrize(
    "reader, key, value",
    [
        (pg_admin.scram_iterations, "POSTGRES_SCRAM_ITERATIONS", "1000"),
        (pg_admin.scram_iterations, "POSTGRES_SCRAM_ITERATIONS", "many"),
        (pg_admin.sslmode, "POSTGRES_SSLMODE", "on"),
        (pg_admin.internal_address, "POSTGRES_INTERNAL_HOST", "pg password=x"),
        (pg_admin.internal_address, "POSTGRES_INTERNAL_PORT", "70000"),
    ],
)
def test_settings_refuse_unsafe_values(mocker, reader, key, value):
    """A lower iteration count, an unknown mode or a bad address is refused"""
    with pytest.raises(ValueError):
        reader(config_with(mocker, **{key: value}))


def test_ensure_login_role_creates_with_a_verifier_only():
    """A new role gets the verifier and never the password"""
    conn = FakeConnection()
    pg_admin.ensure_login_role(conn, "swim_telegraf", "plain-password")
    statement = conn.statements[-1]
    assert statement.startswith('CREATE ROLE "swim_telegraf" WITH LOGIN PASSWORD')
    assert "SCRAM-SHA-256$" in statement
    assert "plain-password" not in " ".join(conn.statements)


def test_ensure_login_role_alters_an_existing_role():
    """An existing role gets its password set again"""
    conn = FakeConnection(rows={"pg_roles": [(1,)]})
    pg_admin.ensure_login_role(conn, "swim_view_ro", "pw")
    assert conn.statements[-1].startswith('ALTER ROLE "swim_view_ro"')
    assert conn.params[0] == ("swim_view_ro",)


def test_ensure_database_ignores_an_existing_database(mocker):
    """A database that exists is kept"""
    conn = MagicMock()
    conn.__enter__.return_value = conn
    conn.execute.side_effect = pg_errors.DuplicateDatabase()
    connect = mocker.patch.object(pg_admin, "connect", return_value=conn)
    pg_admin.ensure_database("swim")
    connect.assert_called_once_with("postgres", autocommit=True)
    assert conn.execute.call_args.args[0].as_string() == 'CREATE DATABASE "swim"'


def test_connect_reads_the_administrator_of_services_env(mocker):
    """The connection uses keyword arguments, not a pasted string"""
    config = mocker.patch.object(pg_admin, "Config").return_value
    config.env = {}
    config.get_value.side_effect = lambda key: f"<{key}>"
    psy = mocker.patch.object(pg_admin.psycopg, "connect")
    pg_admin.connect("swim")
    kwargs = psy.call_args.kwargs
    assert kwargs["dbname"] == "swim"
    assert kwargs["password"] == "<POSTGRES_PASSWORD>"
    assert kwargs["autocommit"] is False
    assert kwargs["sslmode"] == "require"
