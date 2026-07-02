"""Tests for users_utils module."""

import pytest
from src.pkg import users_utils
from src.pkg.users_utils import (
    _next_rule_num,
    _conf_server_block,
    add_conf_server_entry,
    remove_conf_server_entry,
    build_base_mapping,
    resource_mapping,
    is_valid_username,
    validate_usernames,
    report_delete_preview,
)
from tests.conftest import CONF_SERVER_CONTENT


@pytest.mark.parametrize(
    "name,valid",
    [
        ("alice", True),
        ("user.name-1_2", True),
        ("bad;rm -rf", False),
        ("bad name", False),
        ("$(whoami)", False),
        ("-leading-dash", False),
        ("", False),
        (5, False),
    ],
)
def test_is_valid_username(name, valid):
    """Only alphanumeric-plus-._- names (no shell metacharacters) are valid."""
    assert is_valid_username(name) is valid


def test_validate_usernames_raises_on_first_bad_name():
    """validate_usernames names the offending username in the error."""
    with pytest.raises(ValueError, match="bad;name"):
        validate_usernames(["alice", "bad;name"])


def test_validate_usernames_passes_for_all_valid():
    """A list of valid usernames validates without raising."""
    validate_usernames(["alice", "bob-1"])  # must not raise


def test_report_delete_preview_lists_actions(capsys):
    """The dry-run preview names both the deprovision and registry removals."""
    report_delete_preview(["alice"], ["alice", "bob"])

    out = capsys.readouterr().out
    assert "Would deprovision and stop: alice" in out
    assert "Would remove from registry: alice, bob" in out


def test_report_delete_preview_no_provisioned_users(capsys):
    """With nothing provisioned, only the registry-removal line is printed."""
    report_delete_preview([], ["bob"])

    out = capsys.readouterr().out
    assert "Would deprovision" not in out
    assert "Would remove from registry: bob" in out


def test_build_base_mapping_includes_server_dns_for_remote():
    """A non-localhost server contributes a ${SERVER_DNS} placeholder."""
    mapping = build_base_mapping("alice", {"path": "/opt/dtaas", "server": "x.org"})
    assert mapping["${DTAAS_DIR}"] == "/opt/dtaas"
    assert mapping["${username}"] == "alice"
    assert mapping["${SERVER_DNS}"] == "x.org"


def test_build_base_mapping_omits_server_dns_for_localhost():
    """localhost installations carry no ${SERVER_DNS} label."""
    mapping = build_base_mapping("alice", {"path": "/opt/dtaas", "server": "localhost"})
    assert "${SERVER_DNS}" not in mapping


def test_resource_mapping_stringifies_values():
    """resource_mapping renders every limit as a string placeholder value."""
    mapping = resource_mapping(
        {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"}
    )
    assert mapping == {
        "${shm_size}": "512m",
        "${cpus}": "4",
        "${mem_limit}": "4G",
        "${pids_limit}": "4960",
    }


def test_next_rule_num_increments_max():
    """_next_rule_num returns one past the highest existing index"""
    assert _next_rule_num(CONF_SERVER_CONTENT) == 3


def test_next_rule_num_empty_file():
    """_next_rule_num returns 1 when no onlyu rules exist yet"""
    assert _next_rule_num("rule.libms.action=auth\n") == 1


def test_conf_server_block_format():
    """_conf_server_block produces the expected 3-line block"""
    block = _conf_server_block("alice", "alice@example.com", 3)
    assert "rule.onlyu3.action=auth" in block
    assert "rule.onlyu3.rule=PathPrefix(`/alice`)" in block
    assert "rule.onlyu3.whitelist=alice@example.com" in block


def test_add_conf_server_entry_appends_block(tmp_path, monkeypatch):
    """add_conf_server_entry appends rules to an existing conf.server"""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users_utils, "CONF_SERVER_PATH", conf)

    add_conf_server_entry("alice", "alice@example.com")

    result = conf.read_text(encoding="utf-8")
    assert "rule.onlyu3.action=auth" in result
    assert "rule.onlyu3.rule=PathPrefix(`/alice`)" in result
    assert "rule.onlyu3.whitelist=alice@example.com" in result


def test_add_conf_server_entry_skips_existing_user(tmp_path, monkeypatch):
    """add_conf_server_entry does not duplicate a rule for a user already present"""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users_utils, "CONF_SERVER_PATH", conf)

    add_conf_server_entry("user1", "user1@example.com")

    assert conf.read_text(encoding="utf-8") == CONF_SERVER_CONTENT


def test_add_conf_server_entry_skips_when_no_email(tmp_path, monkeypatch):
    """add_conf_server_entry does nothing when email is empty"""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users_utils, "CONF_SERVER_PATH", conf)

    add_conf_server_entry("alice", "")

    assert conf.read_text(encoding="utf-8") == CONF_SERVER_CONTENT


def test_add_conf_server_entry_skips_when_file_missing(tmp_path, monkeypatch):
    """add_conf_server_entry does nothing when conf.server does not exist"""
    monkeypatch.setattr(
        users_utils, "CONF_SERVER_PATH", tmp_path / "missing" / "conf.server"
    )
    add_conf_server_entry("alice", "alice@example.com")  # must not raise


def test_remove_conf_server_entry_removes_block(tmp_path, monkeypatch):
    """remove_conf_server_entry removes the three-line block for the specified user"""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users_utils, "CONF_SERVER_PATH", conf)

    remove_conf_server_entry("user1")

    result = conf.read_text(encoding="utf-8")
    assert "rule.onlyu1" not in result
    assert "user1" not in result
    assert "rule.onlyu2.action=auth" in result
    assert "rule.libms.action=auth" in result


def test_remove_conf_server_entry_skips_when_file_missing(tmp_path, monkeypatch):
    """remove_conf_server_entry does nothing when conf.server does not exist"""
    monkeypatch.setattr(
        users_utils, "CONF_SERVER_PATH", tmp_path / "missing" / "conf.server"
    )
    remove_conf_server_entry("user1")  # must not raise


def test_remove_conf_server_entry_skips_unknown_user(tmp_path, monkeypatch):
    """remove_conf_server_entry leaves the file unchanged when the user has no rules"""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users_utils, "CONF_SERVER_PATH", conf)

    remove_conf_server_entry("ghost")

    assert conf.read_text(encoding="utf-8") == CONF_SERVER_CONTENT
