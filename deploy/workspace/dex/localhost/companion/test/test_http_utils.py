# pylint: disable=missing-function-docstring,too-few-public-methods
"""Tests for companion.src.http_utils module."""

from __future__ import annotations

from http.client import HTTPConnection, HTTPSConnection
from unittest.mock import patch
from urllib.parse import urlsplit

from companion.src import http_utils


class TestNormalizeTargetUrl:
    """Tests for normalize_target_url."""

    def test_simple_path(self):
        with patch.object(
            http_utils,
            "UPSTREAM",
            "http://dex:5556",  # NOSONAR
        ):
            result = http_utils.normalize_target_url("/dex/auth")
        assert result == "http://dex:5556/dex/auth"  # NOSONAR

    def test_path_with_query(self):
        with patch.object(
            http_utils,
            "UPSTREAM",
            "http://dex:5556",  # NOSONAR
        ):
            result = http_utils.normalize_target_url(
                "/dex/auth?code=abc",
            )
        assert result == "http://dex:5556/dex/auth?code=abc"  # NOSONAR

    def test_empty_path_defaults_to_slash(self):
        with patch.object(
            http_utils,
            "UPSTREAM",
            "http://dex:5556",  # NOSONAR
        ):
            result = http_utils.normalize_target_url("")
        assert result == "http://dex:5556/"  # NOSONAR

    def test_full_url_extracts_path(self):
        with patch.object(
            http_utils,
            "UPSTREAM",
            "http://dex:5556",  # NOSONAR
        ):
            result = http_utils.normalize_target_url(
                "http://other:1234/some/path?q=1",  # NOSONAR
            )
        assert result == "http://dex:5556/some/path?q=1"  # NOSONAR


class TestSplitTargetUrl:
    """Tests for split_target_url."""

    def test_returns_split_result(self):
        with patch.object(
            http_utils,
            "UPSTREAM",
            "http://dex:5556",  # NOSONAR
        ):
            result = http_utils.split_target_url("/foo")
        assert result.hostname == "dex"
        assert result.port == 5556


class TestTargetPath:
    """Tests for target_path."""

    def test_path_with_query(self):
        parsed = urlsplit("http://host:80/path?q=1")  # NOSONAR
        assert http_utils.target_path(parsed) == "/path?q=1"

    def test_empty_path_defaults_to_slash(self):
        parsed = urlsplit("http://host:80")  # NOSONAR
        assert http_utils.target_path(parsed) == "/"


class TestTargetPort:
    """Tests for target_port."""

    def test_explicit_port(self):
        parsed = urlsplit("http://host:8080/path")  # NOSONAR
        assert http_utils.target_port(parsed) == 8080

    def test_https_default(self):
        parsed = urlsplit("https://host/path")
        assert http_utils.target_port(parsed) == 443

    def test_http_default(self):
        parsed = urlsplit("http://host/path")  # NOSONAR
        assert http_utils.target_port(parsed) == 80


class TestBuildConnection:
    """Tests for build_connection."""

    def test_http_connection(self):
        parsed = urlsplit("http://dex:5556/path")  # NOSONAR
        conn = http_utils.build_connection(parsed)
        assert isinstance(conn, HTTPConnection)

    def test_https_connection(self):
        parsed = urlsplit("https://dex:5556/path")
        conn = http_utils.build_connection(parsed)
        assert isinstance(conn, HTTPSConnection)


class TestSafeContentLength:
    """Tests for safe_content_length."""

    def test_none_returns_zero(self):
        assert http_utils.safe_content_length(None) == 0

    def test_empty_string_returns_zero(self):
        assert http_utils.safe_content_length("") == 0

    def test_valid_number(self):
        assert http_utils.safe_content_length("42") == 42

    def test_negative_number_returns_zero(self):
        assert http_utils.safe_content_length("-5") == 0

    def test_non_numeric_returns_zero(self):
        assert http_utils.safe_content_length("abc") == 0


class TestIsJsonResponse:
    """Tests for is_json_response."""

    def test_json_content_type(self):
        headers = [
            ("Content-Type", "application/json; charset=utf-8"),
        ]
        assert http_utils.is_json_response(headers) is True

    def test_non_json_content_type(self):
        headers = [("Content-Type", "text/html")]
        assert http_utils.is_json_response(headers) is False

    def test_missing_content_type(self):
        headers = [("X-Custom", "value")]
        assert http_utils.is_json_response(headers) is False

    def test_empty_headers(self):
        assert http_utils.is_json_response([]) is False


class TestShouldForwardHeader:
    """Tests for should_forward_header."""

    def test_host_header_excluded(self):
        assert http_utils.should_forward_header("Host") is False

    def test_hop_by_hop_excluded(self):
        result_te = http_utils.should_forward_header(
            "Transfer-Encoding",
        )
        result_conn = http_utils.should_forward_header(
            "Connection",
        )
        assert result_te is False
        assert result_conn is False

    def test_regular_header_forwarded(self):
        result_auth = http_utils.should_forward_header(
            "Authorization",
        )
        result_accept = http_utils.should_forward_header(
            "Accept",
        )
        assert result_auth is True
        assert result_accept is True
