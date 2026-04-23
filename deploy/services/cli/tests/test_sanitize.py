"""Tests for credential sanitization utilities."""

from dtaas_services.pkg.sanitize import (
    escape_js_string,
)


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
