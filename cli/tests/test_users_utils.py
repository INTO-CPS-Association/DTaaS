"""Tests for users_utils module."""

from src.pkg import users_utils
from src.pkg.users_utils import (
    _next_rule_num,
    _conf_server_block,
    add_conf_server_entry,
    remove_conf_server_entry,
)

CONF_SERVER_CONTENT = (
    "rule.libms.action=auth\n"
    "rule.libms.rule=PathPrefix(`/lib`)\n"
    "\n"
    "rule.onlyu1.action=auth\n"
    "rule.onlyu1.rule=PathPrefix(`/user1`)\n"
    "rule.onlyu1.whitelist=user1@example.com\n"
    "\n"
    "rule.onlyu2.action=auth\n"
    "rule.onlyu2.rule=PathPrefix(`/user2`)\n"
    "rule.onlyu2.whitelist=user2@example.com\n"
)


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
