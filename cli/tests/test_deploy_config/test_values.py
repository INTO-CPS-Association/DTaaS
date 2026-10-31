"""Tests for the deploy_config value helpers: lookup, checks and setters."""

import pytest
from src.pkg.deploy_config import _set_yaml_value, _toml_lookup, _validate_value


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


def test_validate_value_rejects_newline():
    """values containing newlines are rejected"""
    with pytest.raises(ValueError):
        _validate_value("value\nINJECTED=1")


def test_toml_lookup_tells_missing_from_empty():
    """A missing section key is None, an empty one '', so an entry can treat
    an empty value as a choice of its own (logger-url = "" turns logging off)."""
    toml = {"frontend": {"logger-url": ""}}
    assert _toml_lookup(toml, "frontend.logger-url") == ""
    assert _toml_lookup(toml, "frontend.react-app-client-id") is None
    assert _toml_lookup(toml, "localhost.client-id") is None


def test_toml_lookup_returns_empty_for_out_of_range_index():
    """username/email lookups are safe when fewer [[users]] exist than the index"""
    toml = {"users": [{"username": "alice", "email": "a@x.io"}]}
    assert _toml_lookup(toml, "users.username2") == ""
    assert _toml_lookup(toml, "users.email2") == ""


def test_toml_lookup_returns_empty_when_field_missing():
    """A [[users]] record without an email yields '' rather than raising"""
    toml = {"users": [{"username": "alice"}]}
    assert _toml_lookup(toml, "users.email1") == ""


def test_toml_lookup_returns_empty_when_users_not_a_list():
    """A malformed (old dict-based) 'users' value degrades to '' instead of raising"""
    toml = {"users": {"starting": ["alice"], "alice": {"email": "a@x.io"}}}
    assert _toml_lookup(toml, "users.username1") == ""
    assert _toml_lookup(toml, "users.email1") == ""


def test_toml_lookup_rejects_zero_index_pseudo_key():
    """A '<field>0' pseudo-key (index -1) resolves to '' rather than the last user"""
    toml = {"users": [{"username": "alice", "email": "a@x.io"}]}
    assert _toml_lookup(toml, "users.username0") == ""
    assert _toml_lookup(toml, "users.email0") == ""
