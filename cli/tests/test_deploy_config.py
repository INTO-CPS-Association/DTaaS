"""Tests for the deploy_config module."""

import pytest
from pathlib import Path
from unittest.mock import patch
from src.pkg.deploy_config import (
    _set_yaml_value,
    _toml_lookup,
    _validate_value,
    build_file_specs,
    apply_config,
    check_placeholders,
)


ENV_TEXT = (
    "# Server Configuration\n"
    "SERVER_DNS=localhost\n"
    "\n"
    "# OAuth Application Client ID\n"
    "OAUTH_CLIENT_ID=your_client_id_here\n"
)

JS_TEXT = (
    "if (typeof window !== 'undefined') {\n"
    "  window.env = {\n"
    "    REACT_APP_CLIENT_ID: 'your_client_id_here',\n"
    "    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com',\n"
    "  };\n"
    "};\n"
)

YAML_TEXT = (
    "issuer: http://localhost:5556/dex\n"
    "staticClients:\n"
    "  - id: mock\n"
    "    name: 'DTaaS'\n"
)


def test_set_yaml_value_replaces_top_level_key():
    """yaml setter changes a top-level scalar value"""
    result = _set_yaml_value(YAML_TEXT, "issuer", "https://auth.example.com")
    assert "issuer: https://auth.example.com\n" in result


def test_build_file_specs_insecure_server():
    """insecure-server splits server and frontend OAuth apps per file"""
    toml = {
        "common": {"server-dns": "myserver.com"},
        "users": {"add": ["alice"], "alice": {"email": "alice@example.com"}},
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
        "users": {"add": ["alice"]},
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


def test_apply_config_edits_files_by_key(tmp_path):
    """apply_config edits the targeted keys in each config file"""
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / ".env").write_text(ENV_TEXT)
    (config_dir / "client.js").write_text(JS_TEXT)

    apply_config(
        str(tmp_path),
        [
            ("config/.env", "env", {"SERVER_DNS": "myserver.com"}),
            ("config/client.js", "js", {"REACT_APP_CLIENT_ID": "real_id"}),
        ],
    )

    assert "SERVER_DNS=myserver.com" in (config_dir / ".env").read_text()
    client_js = (config_dir / "client.js").read_text()
    assert "REACT_APP_CLIENT_ID: 'real_id'" in client_js


def test_apply_config_skips_missing_files(tmp_path):
    """specs for files absent from dest_dir are skipped silently"""
    apply_config(str(tmp_path), [("config/.env", "env", {"KEY": "value"})])


def test_apply_config_raises_on_file_error(tmp_path):
    """write failures are collected and raised as OSError"""
    bad = tmp_path / ".env"
    bad.write_text("SERVER_DNS=localhost\n")
    with patch.object(Path, "write_text", side_effect=OSError("permission denied")):
        with pytest.raises(OSError):
            apply_config(str(tmp_path), [(".env", "env", {"SERVER_DNS": "x"})])


def test_validate_value_rejects_newline():
    """values containing newlines are rejected"""
    with pytest.raises(ValueError):
        _validate_value("value\nINJECTED=1")


def test_check_placeholders_returns_warning_for_unresolved(tmp_path):
    """check_placeholders warns when a known secret placeholder remains in a file"""
    env = tmp_path / "config" / ".env"
    env.parent.mkdir()
    env.write_text("OAUTH_CLIENT_ID=your_client_id_here\n")

    warnings = check_placeholders(
        str(tmp_path),
        [("config/.env", "env", {"OAUTH_CLIENT_ID": "real_id"})],
    )
    assert any("your_client_id_here" in w for w in warnings)


def test_check_placeholders_skips_missing_files(tmp_path):
    """check_placeholders ignores files that don't exist in dest_dir"""
    warnings = check_placeholders(
        str(tmp_path),
        [("config/.env", "env", {})],
    )
    assert not warnings


def test_apply_config_skips_binary_file(tmp_path):
    """apply_config leaves binary files (NUL-byte detected) untouched"""
    binary = tmp_path / ".env"
    binary.write_bytes(b"SERVER_DNS=\x00value\n")
    original = binary.read_bytes()
    apply_config(str(tmp_path), [(".env", "env", {"SERVER_DNS": "x"})])
    assert binary.read_bytes() == original


def test_toml_lookup_user_collision_reserved_key():
    """email lookup is safe when a username collides with the 'add' key"""
    toml = {"users": {"add": ["add"]}}
    assert _toml_lookup(toml, "users.email1") == ""
