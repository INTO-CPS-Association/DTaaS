"""Tests for the deploy_config module."""

import pytest
from src.pkg.deploy_config import (
    _is_text_file,
    _substitute,
    _apply_to_file,
    apply_config,
    build_mapping,
    _add_common_entries,
    _add_user_entries,
    _add_email_entries,
    _add_deploy_entries,
)


def test_is_text_file_returns_false_for_png(tmp_path):
    png = tmp_path / "image.png"
    png.write_bytes(b"\x89PNG\r\n")
    assert not _is_text_file(png)


def test_is_text_file_returns_true_for_env(tmp_path):
    f = tmp_path / ".env.example"
    f.write_text("KEY=value")
    assert _is_text_file(f)


def test_is_text_file_returns_false_for_directory(tmp_path):
    assert not _is_text_file(tmp_path)


def test_substitute_replaces_longer_key_first():
    mapping = {"user1@email.com": "john@example.com", "user1": "john"}
    result = _substitute("path=/user1 email=user1@email.com", mapping)
    assert result == "path=/john email=john@example.com"


def test_substitute_no_match_returns_unchanged():
    result = _substitute("no match here", {"MISSING": "value"})
    assert result == "no match here"


def test_apply_to_file_replaces_content(tmp_path):
    f = tmp_path / "config.env"
    f.write_text("SERVER_DNS=localhost\n")
    result = _apply_to_file(f, {"SERVER_DNS=localhost": "SERVER_DNS=myserver.com"})
    assert result is None
    assert f.read_text() == "SERVER_DNS=myserver.com\n"


def test_apply_to_file_leaves_unchanged_file_unwritten(tmp_path):
    f = tmp_path / "config.env"
    f.write_text("unchanged content\n")
    mtime = f.stat().st_mtime_ns
    _apply_to_file(f, {"MISSING": "value"})
    assert f.stat().st_mtime_ns == mtime


def test_apply_to_file_returns_error_on_read_failure(tmp_path):
    missing = tmp_path / "nonexistent.txt"
    result = _apply_to_file(missing, {"x": "y"})
    assert result is not None
    assert isinstance(result, str)


def test_apply_config_substitutes_text_files(tmp_path):
    (tmp_path / "a.txt").write_text("your_client_id_here")
    (tmp_path / "b.txt").write_text("unchanged")
    apply_config(str(tmp_path), {"your_client_id_here": "real_id"})
    assert (tmp_path / "a.txt").read_text() == "real_id"
    assert (tmp_path / "b.txt").read_text() == "unchanged"


def test_apply_config_skips_binary_files(tmp_path):
    png = tmp_path / "image.png"
    original = b"\x89PNG\r\n\x1a\n"
    png.write_bytes(original)
    apply_config(str(tmp_path), {"P": "X"})
    assert png.read_bytes() == original


def test_apply_config_no_op_on_empty_mapping(tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("unchanged")
    apply_config(str(tmp_path), {})
    assert f.read_text() == "unchanged"


def test_apply_config_raises_on_file_error(tmp_path):
    bad = tmp_path / "locked.txt"
    bad.write_text("content")
    bad.chmod(0o444)
    try:
        with pytest.raises(OSError):
            apply_config(str(tmp_path), {"content": "new"})
    finally:
        bad.chmod(0o644)


def test_add_common_entries_maps_both_server_dns_placeholders():
    mapping = {}
    _add_common_entries({"server-dns": "prod.example.com"}, mapping)
    assert mapping["SERVER_DNS=localhost"] == "SERVER_DNS=prod.example.com"
    assert mapping["SERVER_DNS=intocps.org"] == "SERVER_DNS=prod.example.com"


def test_add_common_entries_skips_empty_server_dns():
    mapping = {}
    _add_common_entries({"server-dns": ""}, mapping)
    assert not mapping


def test_add_user_entries_maps_username_and_path():
    mapping = {}
    _add_user_entries({"add": ["alice", "bob"]}, mapping)
    assert mapping["USERNAME1=user1"] == "USERNAME1=alice"
    assert mapping["USERNAME2=user2"] == "USERNAME2=bob"
    assert mapping["/user1"] == "/alice"
    assert mapping["/user2"] == "/bob"


def test_add_user_entries_limited_to_two_users():
    mapping = {}
    _add_user_entries({"add": ["u1", "u2", "u3"]}, mapping)
    assert "USERNAME1=user1" in mapping
    assert "USERNAME2=user2" in mapping
    assert all("user3" not in k for k in mapping)


def test_add_user_entries_includes_emails():
    mapping = {}
    users = {
        "add": ["alice"],
        "alice": {"email": "alice@example.com"},
    }
    _add_user_entries(users, mapping)
    assert mapping.get("user1@emailservice.com") == "alice@example.com"


def test_add_email_entries_maps_correct_index():
    mapping = {}
    _add_email_entries(1, "bob@example.com", mapping)
    assert mapping.get("user2@emailservice.com") == "bob@example.com"
    assert "user1@emailservice.com" not in mapping


def test_add_deploy_entries_maps_credentials():
    mapping = {}
    section = {
        "oauth-client-id": "my_id",
        "oauth-client-secret": "my_secret",
        "oauth-secret": "my_oauth_secret",
    }
    _add_deploy_entries("insecure-server", section, mapping)
    assert mapping.get("your_client_id_here") == "my_id"
    assert mapping.get("your_client_secret_here") == "my_secret"
    assert mapping.get("your_random_secret_key_here") == "my_oauth_secret"


def test_add_deploy_entries_skips_empty_values():
    mapping = {}
    _add_deploy_entries("localhost", {"default-user": ""}, mapping)
    assert "DEFAULT_USER=user1" not in mapping


def test_build_mapping_localhost_default_user():
    toml = {"localhost": {"default-user": "admin"}}
    mapping = build_mapping("localhost", toml)
    assert mapping.get("DEFAULT_USER=user1") == "DEFAULT_USER=admin"


def test_build_mapping_insecure_server_credentials():
    toml = {
        "insecure-server": {
            "oauth-client-id": "client_abc",
            "oauth-client-secret": "secret_xyz",
            "oauth-secret": "random_key",
        }
    }
    mapping = build_mapping("insecure-server", toml)
    assert mapping["your_client_id_here"] == "client_abc"
    assert mapping["your_client_secret_here"] == "secret_xyz"
    assert mapping["your_random_secret_key_here"] == "random_key"


def test_build_mapping_includes_server_dns():
    toml = {"common": {"server-dns": "myserver.com"}}
    mapping = build_mapping("secure-server", toml)
    assert mapping.get("SERVER_DNS=localhost") == "SERVER_DNS=myserver.com"


def test_build_mapping_includes_usernames_and_paths():
    toml = {"users": {"add": ["alice", "bob"]}}
    mapping = build_mapping("secure-server", toml)
    assert mapping.get("USERNAME1=user1") == "USERNAME1=alice"
    assert mapping.get("/user1") == "/alice"
    assert mapping.get("USERNAME2=user2") == "USERNAME2=bob"


def test_build_mapping_workspace_secure_server():
    toml = {
        "workspace-secure-server": {
            "keycloak-admin-password": "strongpass",
            "keycloak-client-secret": "kcsecret",
            "keycloak-realm": "myrealm",
        }
    }
    mapping = build_mapping("workspace-secure-server", toml)
    assert mapping["KEYCLOAK_ADMIN_PASSWORD=changeme"] == "KEYCLOAK_ADMIN_PASSWORD=strongpass"
    assert mapping["your_keycloak_client_secret_here"] == "kcsecret"
    assert mapping["KEYCLOAK_REALM=dtaas"] == "KEYCLOAK_REALM=myrealm"


def test_build_mapping_workspace_localhost_client_id():
    toml = {"workspace-localhost": {"client-id": "myapp"}}
    mapping = build_mapping("workspace-localhost", toml)
    assert mapping.get("id: mock") == "id: myapp"
    assert mapping.get("REACT_APP_CLIENT_ID: 'mock'") == "REACT_APP_CLIENT_ID: 'myapp'"


def test_build_mapping_returns_empty_for_unknown_type():
    mapping = build_mapping("unknown-type", {})
    assert mapping == {}
