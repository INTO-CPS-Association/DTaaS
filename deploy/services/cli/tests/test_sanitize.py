"""Tests for credential sanitization utilities."""

from dtaas_services.pkg.sanitize import (
    escape_sql_identifier,
    escape_sql_literal,
    escape_js_string,
)


def test_escape_sql_identifier_clean():
    """Safe identifier passes through unchanged."""
    assert escape_sql_identifier("alice") == "alice"


def test_escape_sql_identifier_double_quote():
    """Double-quotes are doubled to prevent SQL injection."""
    assert escape_sql_identifier('user"name') == 'user""name'


def test_escape_sql_identifier_multiple_quotes():
    """Multiple double-quotes are all escaped."""
    assert escape_sql_identifier('"admin"') == '""admin""'


def test_escape_sql_literal_clean():
    """Safe literal passes through unchanged."""
    assert escape_sql_literal("securepassword") == "securepassword"


def test_escape_sql_literal_single_quote():
    """Single-quotes are doubled to prevent SQL injection."""
    assert escape_sql_literal("pass'word") == "pass''word"


def test_escape_sql_literal_multiple_quotes():
    """Multiple single-quotes are all escaped."""
    assert escape_sql_literal("it's a 'test'") == "it''s a ''test''"


def test_escape_js_string_clean():
    """Safe string passes through unchanged."""
    assert escape_js_string("alice") == "alice"


def test_escape_js_string_single_quote():
    """Single-quotes are backslash-escaped."""
    assert escape_js_string("pass'word") == "pass\\'word"


def test_escape_js_string_backslash():
    """Backslashes are doubled before single-quote escaping."""
    assert escape_js_string("back\\slash") == "back\\\\slash"


def test_escape_js_string_backslash_before_quote():
    """Backslash followed by quote is both escaped correctly."""
    assert escape_js_string("\\'") == "\\\\\\'"
