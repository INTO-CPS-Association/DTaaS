# pylint: disable=missing-function-docstring
"""Tests for companion.src.config module."""

from __future__ import annotations

from companion.src.config import _parse_port


class TestParsePort:
    """Tests for _parse_port."""

    def test_valid_port(self):
        assert _parse_port("8080") == 8080

    def test_none_returns_default(self):
        assert _parse_port(None) == 5556

    def test_empty_string_returns_default(self):
        assert _parse_port("") == 5556

    def test_invalid_string_returns_default(self):
        assert _parse_port("abc") == 5556

    def test_custom_default(self):
        assert _parse_port(None, default=9999) == 9999

    def test_invalid_with_custom_default(self):
        assert _parse_port("xyz", default=3000) == 3000
