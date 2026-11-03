"""Tests for the deploy_config value helpers: lookup, checks and setters."""

import ast
import re
import pytest
from src.pkg.deploy_config import (
    _set_js_value,
    _set_yaml_value,
    _toml_lookup,
    _validate_value,
)

JS_TEXT = (
    "    LOGGER_URL: 'https://intocps.org/logger',\n"
    "    REACT_APP_URL: 'https://myserver.com',\n"
)
# Python reads \\ and \' in a single quoted literal as JS does.
JS_VALUES = [
    "https://myserver.com/logger",
    "",
    "it's",
    "a\\b",
    "ends\\",
    "\\'",
    "https://a/x\\', REACT_APP_URL: (globalThis.pwned=1)//",
]
JS_IDS = ["url", "empty", "quote", "backslash", "trailing", "escaped", "injection"]


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


@pytest.mark.parametrize("value", JS_VALUES, ids=JS_IDS)
def test_set_js_value_writes_one_string_literal(value):
    """Whatever the value holds, the key gets one JS string literal that
    reads back as that value, and the next key is left as it was."""
    first, second = _set_js_value(JS_TEXT, "LOGGER_URL", value).splitlines()
    literal = re.fullmatch(r"    LOGGER_URL: (.*),", first)
    assert literal
    assert ast.literal_eval(literal.group(1)) == value
    assert second == "    REACT_APP_URL: 'https://myserver.com',"


@pytest.mark.parametrize("value", JS_VALUES, ids=JS_IDS)
def test_set_js_value_replaces_its_own_output(value):
    """A second write replaces all of the first one, escapes included, so a
    repeated 'platform update --config' never leaves a tail behind."""
    once = _set_js_value(JS_TEXT, "LOGGER_URL", value)
    again = _set_js_value(once, "LOGGER_URL", "https://myserver.com/logger")
    assert again == _set_js_value(JS_TEXT, "LOGGER_URL", "https://myserver.com/logger")


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
