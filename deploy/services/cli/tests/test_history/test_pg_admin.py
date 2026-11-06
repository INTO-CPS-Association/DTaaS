"""Tests for the administrator connection and login roles"""

import base64
import hashlib
import hmac
from unittest.mock import MagicMock
from psycopg import errors as pg_errors
from dtaas_services.pkg.history import pg_admin
from .conftest import FakeConnection


def test_scram_verifier_matches_the_rfc_5803_format():
    """The verifier holds the iterations, salt, stored key and server key"""
    verifier = pg_admin.scram_verifier("s3cret")
    scheme, rest = verifier.split("$", 1)
    params, keys = rest.split("$")
    iterations, salt = params.split(":")
    stored_key, server_key = (base64.b64decode(k) for k in keys.split(":"))
    salted = hashlib.pbkdf2_hmac(
        "sha256", b"s3cret", base64.b64decode(salt), int(iterations)
    )
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    assert scheme == "SCRAM-SHA-256"
    assert stored_key == hashlib.sha256(client_key).digest()
    assert server_key == hmac.new(salted, b"Server Key", hashlib.sha256).digest()


def test_scram_verifier_uses_a_new_salt_each_time():
    """Two verifiers of one password differ"""
    assert pg_admin.scram_verifier("pw") != pg_admin.scram_verifier("pw")


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
    config.get_value.side_effect = lambda key: f"<{key}>"
    psy = mocker.patch.object(pg_admin.psycopg, "connect")
    pg_admin.connect("swim")
    kwargs = psy.call_args.kwargs
    assert kwargs["dbname"] == "swim"
    assert kwargs["password"] == "<POSTGRES_PASSWORD>"
    assert kwargs["autocommit"] is False
