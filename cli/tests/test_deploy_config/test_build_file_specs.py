"""Tests for deploy_config.build_file_specs: what each deploy type writes."""

import pytest
from src.pkg.deploy_config import build_file_specs

LOGGER = "https://logs.example.com/logger"


def test_build_file_specs_insecure_server():
    """insecure-server splits server and frontend OAuth apps per file"""
    toml = {
        "common": {"server-dns": "myserver.com"},
        "users": [{"username": "alice", "email": "alice@example.com"}],
        "insecure-server": {
            "oauth-client-id": "server_id",
            "oauth-client-secret": "server_secret",
        },
        "frontend": {
            "react-app-client-id": "client_id",
            "react-app-oauth-url": "https://gitlab.example.com",
        },
    }
    specs = {
        path: (fmt, values)
        for path, fmt, values in build_file_specs("insecure-server", toml)
    }

    env_format, env_values = specs["config/.env"]
    assert env_format == "env"
    assert env_values["SERVER_DNS"] == "myserver.com"
    assert env_values["USERNAME1"] == "alice"
    assert env_values["OAUTH_CLIENT_ID"] == "server_id"
    assert env_values["OAUTH_CLIENT_SECRET"] == "server_secret"
    assert "OAUTH_SECRET" not in env_values

    js_format, js_values = specs["config/client.js"]
    insecure = "http"
    assert js_format == "js"
    assert js_values["REACT_APP_CLIENT_ID"] == "client_id"
    assert js_values["REACT_APP_AUTH_AUTHORITY"] == "https://gitlab.example.com"
    assert js_values["REACT_APP_URL"] == f"{insecure}://myserver.com"
    assert js_values["REACT_APP_REDIRECT_URI"] == f"{insecure}://myserver.com/Library"
    assert js_values["REACT_APP_LOGOUT_REDIRECT_URI"] == f"{insecure}://myserver.com/"

    conf_format, conf_values = specs["config/conf.server"]
    assert conf_format == "env"
    assert conf_values["rule.onlyu1.rule"] == "PathPrefix(`/alice`)"
    assert conf_values["rule.onlyu1.whitelist"] == "alice@example.com"


def test_build_file_specs_secure_server_uses_https():
    """secure-server uses https:// for REACT_APP_URL and friends"""
    toml = {
        "common": {"server-dns": "myserver.com"},
        "users": [{"username": "alice"}],
        "secure-server": {
            "oauth-client-id": "id",
            "oauth-client-secret": "secret",
        },
        "frontend": {
            "react-app-client-id": "client_id",
            "react-app-oauth-url": "https://gitlab.example.com",
        },
    }
    specs = {
        path: (fmt, values)
        for path, fmt, values in build_file_specs("secure-server", toml)
    }
    js_values = specs["config/client.js"][1]
    assert js_values["REACT_APP_URL"] == "https://myserver.com"
    assert js_values["REACT_APP_REDIRECT_URI"] == "https://myserver.com/Library"
    assert js_values["REACT_APP_LOGOUT_REDIRECT_URI"] == "https://myserver.com/"


def test_build_file_specs_secure_server_gitlab_includes_oauth_url():
    """secure-server-gitlab substitutes OAUTH_URL like the other server types"""
    toml = {
        "common": {"server-dns": "myserver.com"},
        "users": [],
        "secure-server-gitlab": {
            "oauth-url": "https://gitlab.example.com",
            "oauth-client-id": "id",
            "oauth-client-secret": "secret",
        },
        "frontend": {
            "react-app-client-id": "client_id",
            "react-app-oauth-url": "https://gitlab.example.com",
        },
    }
    specs = {
        path: (fmt, values)
        for path, fmt, values in build_file_specs("secure-server-gitlab", toml)
    }
    env_values = specs["config/.env"][1]
    assert env_values["OAUTH_URL"] == "https://gitlab.example.com"


def test_build_file_specs_workspace_localhost_targets_config_env():
    """workspace-localhost writes DEFAULT_USER into config/.env, not the root .env."""
    toml = {
        "workspace-localhost": {
            "default-user": "user1",
            "client-id": "wl-client",
            "auth-authority": "http://localhost:5556/dex",
        },
    }
    specs = {
        path: (fmt, values)
        for path, fmt, values in build_file_specs("workspace-localhost", toml)
    }
    assert ".env" not in specs
    env_format, env_values = specs["config/.env"]
    assert env_format == "env"
    assert env_values["DEFAULT_USER"] == "user1"


def test_build_file_specs_workspace_secure_server_targets_config_env():
    """workspace-secure-server writes Keycloak/OAuth values into config/.env."""
    toml = {
        "common": {"server-dns": "myserver.com"},
        "users": [{"username": "alice"}, {"username": "bob"}],
        "workspace-secure-server": {
            "oauth-secret": "sekret",
            "keycloak-admin": "admin",
            "keycloak-admin-password": "pw",
            "keycloak-realm": "dtaas",
            "keycloak-issuer-url": "https://auth.example.com",
            "keycloak-client-id": "kc-client",
            "keycloak-client-secret": "kc-secret",
        },
    }
    specs = {
        path: (fmt, values)
        for path, fmt, values in build_file_specs("workspace-secure-server", toml)
    }
    assert ".env" not in specs
    env_format, env_values = specs["config/.env"]
    assert env_format == "env"
    assert env_values["SERVER_DNS"] == "myserver.com"
    assert env_values["USERNAME1"] == "alice"
    assert env_values["USERNAME2"] == "bob"
    assert env_values["KEYCLOAK_ADMIN"] == "admin"
    assert env_values["KEYCLOAK_CLIENT_SECRET"] == "kc-secret"


@pytest.mark.parametrize(
    "frontend,expected",
    [
        ({}, "{scheme}://myserver.com/logger"),
        ({"logger-url": LOGGER}, LOGGER),
        ({"logger-url": ""}, ""),
        ({"logger-url": "  "}, ""),
    ],
    ids=["unset", "set", "empty", "blank"],
)
def test_build_file_specs_logger_url(server_type, frontend, expected):
    """LOGGER_URL is this installation's logger unless logger-url names
    another, and empty (remote logging off) when logger-url is empty."""
    deploy_type, scheme = server_type
    toml = {"common": {"server-dns": "myserver.com"}, "frontend": frontend}
    specs = {path: values for path, _, values in build_file_specs(deploy_type, toml)}
    assert specs["config/client.js"]["LOGGER_URL"] == expected.format(scheme=scheme)


@pytest.mark.parametrize("logger_url", [LOGGER, ""])
@pytest.mark.parametrize(
    "deploy_type", ["localhost", "workspace-localhost", "workspace-secure-server"]
)
def test_build_file_specs_logger_url_only_for_server_types(deploy_type, logger_url):
    """[frontend] logger-url, set or empty, never reaches the other types' files."""
    toml = {
        "common": {"server-dns": "myserver.com"},
        "frontend": {"logger-url": logger_url},
        "localhost": {"client-id": "id"},
        "workspace-localhost": {"client-id": "id"},
    }
    specs = build_file_specs(deploy_type, toml)
    assert specs
    assert all("LOGGER_URL" not in values for _, _, values in specs)
