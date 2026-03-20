# pylint: disable=invalid-name
"""Tests for dex-companion reverse proxy helper."""

from __future__ import annotations

import importlib.util
import io
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest


def _load_companion_module() -> ModuleType:
    """Import dex-companion.py despite the hyphenated filename."""
    module_path = Path(__file__).resolve().parent.parent / "dex-companion.py"
    spec = importlib.util.spec_from_file_location("dex_companion", module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["dex_companion"] = module
    spec.loader.exec_module(module)
    return module


companion = _load_companion_module()


# ---------------------------------------------------------------------------
# Helper: build a minimal fake request handler for unit-testing class methods
# ---------------------------------------------------------------------------
class _FakeRequest(io.BytesIO):
    """Mimics a socket makefile() return for BaseHTTPRequestHandler."""

    def makefile(self, *_args, **_kwargs):
        return self


def _make_handler(
    method: str = "GET",
    path: str = "/dex/userinfo",
    body: bytes = b"",
    headers: dict[str, str] | None = None,
) -> companion.DexCompanionHandler:
    """Build a DexCompanionHandler without a real socket."""
    if headers is None:
        headers = {}
    content_length = len(body)
    header_lines = "".join(f"{k}: {v}\r\n" for k, v in headers.items())
    if content_length:
        header_lines += f"Content-Length: {content_length}\r\n"
    raw = (
        f"{method} {path} HTTP/1.1\r\nHost: localhost\r\n{header_lines}\r\n"
    ).encode() + body

    rfile = io.BytesIO(raw)
    wfile = io.BytesIO()

    handler = companion.DexCompanionHandler.__new__(companion.DexCompanionHandler)
    handler.rfile = rfile
    handler.wfile = wfile
    handler.client_address = ("127.0.0.1", 9999)
    handler.server = MagicMock()
    handler.raw_requestline = rfile.readline()
    handler.parse_request()
    return handler


# ===================================================================
# Pure-function unit tests
# ===================================================================


class TestNormalizeTargetUrl:
    """Tests for _normalize_target_url."""

    def test_simple_path(self):
        with patch.object(companion, "UPSTREAM", "http://dex:5556"):
            result = companion._normalize_target_url("/dex/auth")
        assert result == "http://dex:5556/dex/auth"

    def test_path_with_query(self):
        with patch.object(companion, "UPSTREAM", "http://dex:5556"):
            result = companion._normalize_target_url("/dex/auth?code=abc")
        assert result == "http://dex:5556/dex/auth?code=abc"

    def test_empty_path_defaults_to_slash(self):
        with patch.object(companion, "UPSTREAM", "http://dex:5556"):
            result = companion._normalize_target_url("")
        assert result == "http://dex:5556/"

    def test_full_url_extracts_path(self):
        with patch.object(companion, "UPSTREAM", "http://dex:5556"):
            result = companion._normalize_target_url("http://other:1234/some/path?q=1")
        assert result == "http://dex:5556/some/path?q=1"


class TestSplitTargetUrl:
    """Tests for _split_target_url."""

    def test_returns_split_result(self):
        with patch.object(companion, "UPSTREAM", "http://dex:5556"):
            result = companion._split_target_url("/foo")
        assert result.hostname == "dex"
        assert result.port == 5556


class TestTargetPath:
    """Tests for _target_path."""

    def test_path_with_query(self):
        from urllib.parse import urlsplit

        parsed = urlsplit("http://host:80/path?q=1")
        assert companion._target_path(parsed) == "/path?q=1"

    def test_empty_path_defaults_to_slash(self):
        from urllib.parse import urlsplit

        parsed = urlsplit("http://host:80")
        assert companion._target_path(parsed) == "/"


class TestTargetPort:
    """Tests for _target_port."""

    def test_explicit_port(self):
        from urllib.parse import urlsplit

        parsed = urlsplit("http://host:8080/path")
        assert companion._target_port(parsed) == 8080

    def test_https_default(self):
        from urllib.parse import urlsplit

        parsed = urlsplit("https://host/path")
        assert companion._target_port(parsed) == 443

    def test_http_default(self):
        from urllib.parse import urlsplit

        parsed = urlsplit("http://host/path")
        assert companion._target_port(parsed) == 80


class TestBuildConnection:
    """Tests for _build_connection."""

    def test_http_connection(self):
        from http.client import HTTPConnection
        from urllib.parse import urlsplit

        parsed = urlsplit("http://dex:5556/path")
        conn = companion._build_connection(parsed)
        assert isinstance(conn, HTTPConnection)

    def test_https_connection(self):
        from http.client import HTTPSConnection
        from urllib.parse import urlsplit

        parsed = urlsplit("https://dex:5556/path")
        conn = companion._build_connection(parsed)
        assert isinstance(conn, HTTPSConnection)


class TestSafeContentLength:
    """Tests for _safe_content_length."""

    def test_none_returns_zero(self):
        assert companion._safe_content_length(None) == 0

    def test_empty_string_returns_zero(self):
        assert companion._safe_content_length("") == 0

    def test_valid_number(self):
        assert companion._safe_content_length("42") == 42

    def test_negative_number_returns_zero(self):
        assert companion._safe_content_length("-5") == 0

    def test_non_numeric_returns_zero(self):
        assert companion._safe_content_length("abc") == 0


class TestIsJsonResponse:
    """Tests for _is_json_response."""

    def test_json_content_type(self):
        headers = [("Content-Type", "application/json; charset=utf-8")]
        assert companion._is_json_response(headers) is True

    def test_non_json_content_type(self):
        headers = [("Content-Type", "text/html")]
        assert companion._is_json_response(headers) is False

    def test_missing_content_type(self):
        headers = [("X-Custom", "value")]
        assert companion._is_json_response(headers) is False

    def test_empty_headers(self):
        assert companion._is_json_response([]) is False


class TestDecodeJsonObject:
    """Tests for _decode_json_object."""

    def test_valid_json_dict(self):
        body = json.dumps({"key": "value"}).encode()
        result = companion._decode_json_object(body)
        assert result == {"key": "value"}

    def test_json_array_returns_none(self):
        body = json.dumps([1, 2, 3]).encode()
        assert companion._decode_json_object(body) is None

    def test_invalid_json_returns_none(self):
        assert companion._decode_json_object(b"not json") is None

    def test_invalid_utf8_returns_none(self):
        assert companion._decode_json_object(b"\xff\xfe") is None


class TestBuildProfileClaim:
    """Tests for _build_profile_claim."""

    def test_with_issuer_and_username(self):
        payload = {
            "preferred_username": "alice",
            "iss": "http://dex:5556/dex",
        }
        result = companion._build_profile_claim(payload)
        assert result == "http://dex:5556/dex/alice"

    def test_without_issuer(self):
        payload = {"preferred_username": "bob"}
        result = companion._build_profile_claim(payload)
        assert result == "/users/bob"

    def test_missing_username(self):
        payload = {"iss": "http://dex:5556/dex"}
        assert companion._build_profile_claim(payload) is None

    def test_empty_username(self):
        payload = {"preferred_username": ""}
        assert companion._build_profile_claim(payload) is None

    def test_non_string_username(self):
        payload = {"preferred_username": 123}
        assert companion._build_profile_claim(payload) is None

    def test_none_payload(self):
        assert companion._build_profile_claim(None) is None

    def test_issuer_trailing_slash_stripped(self):
        payload = {
            "preferred_username": "alice",
            "iss": "http://dex:5556/dex/",
        }
        result = companion._build_profile_claim(payload)
        assert result == "http://dex:5556/dex/alice"


class TestInjectProfileClaim:
    """Tests for _inject_profile_claim."""

    def test_injects_profile_on_userinfo_path(self):
        body = json.dumps(
            {"preferred_username": "alice", "iss": "http://dex:5556/dex"}
        ).encode()
        headers = [("Content-Type", "application/json")]
        result = companion._inject_profile_claim("/dex/userinfo", headers, body)
        parsed = json.loads(result)
        assert parsed["profile"] == "http://dex:5556/dex/alice"

    def test_does_not_inject_on_other_paths(self):
        body = json.dumps({"preferred_username": "alice"}).encode()
        headers = [("Content-Type", "application/json")]
        result = companion._inject_profile_claim("/dex/token", headers, body)
        assert result == body

    def test_does_not_inject_if_non_json(self):
        body = json.dumps({"preferred_username": "alice"}).encode()
        headers = [("Content-Type", "text/html")]
        result = companion._inject_profile_claim("/dex/userinfo", headers, body)
        assert result == body

    def test_preserves_existing_profile(self):
        body = json.dumps(
            {"preferred_username": "alice", "profile": "existing"}
        ).encode()
        headers = [("Content-Type", "application/json")]
        result = companion._inject_profile_claim("/dex/userinfo", headers, body)
        parsed = json.loads(result)
        assert parsed["profile"] == "existing"

    def test_no_username_no_injection(self):
        body = json.dumps({"sub": "12345"}).encode()
        headers = [("Content-Type", "application/json")]
        result = companion._inject_profile_claim("/dex/userinfo", headers, body)
        assert result == body

    def test_invalid_json_body_returns_unchanged(self):
        body = b"not json"
        headers = [("Content-Type", "application/json")]
        result = companion._inject_profile_claim("/dex/userinfo", headers, body)
        assert result == body


class TestShouldForwardHeader:
    """Tests for _should_forward_header."""

    def test_host_header_excluded(self):
        assert companion._should_forward_header("Host") is False

    def test_hop_by_hop_excluded(self):
        assert companion._should_forward_header("Transfer-Encoding") is False
        assert companion._should_forward_header("Connection") is False

    def test_regular_header_forwarded(self):
        assert companion._should_forward_header("Authorization") is True
        assert companion._should_forward_header("Accept") is True


# ===================================================================
# Handler method tests
# ===================================================================


class TestHandlerReadRequestBody:
    """Tests for DexCompanionHandler._read_request_body."""

    def test_no_content_length(self):
        handler = _make_handler("GET", "/path")
        result = handler._read_request_body()
        assert result is None

    def test_with_body(self):
        body = b"hello"
        handler = _make_handler(
            "POST",
            "/path",
            body=body,
            headers={"Content-Type": "text/plain"},
        )
        result = handler._read_request_body()
        assert result == body


class TestHandlerCopyRequestHeaders:
    """Tests for DexCompanionHandler._copy_request_headers."""

    def test_filters_hop_by_hop_and_host(self):
        handler = _make_handler(
            "GET",
            "/path",
            headers={
                "Authorization": "Bearer token",
                "Connection": "keep-alive",
            },
        )
        copied = handler._copy_request_headers()
        assert "Authorization" in copied
        assert "Connection" not in copied
        assert "Host" not in copied


class TestHandlerWriteResponse:
    """Tests for DexCompanionHandler._write_response."""

    def test_writes_response(self):
        handler = _make_handler("GET", "/path")
        handler._write_response(
            200,
            [
                ("X-Custom", "value"),
                ("Server", "test"),
                ("Content-Length", "999"),
            ],
            b"body",
        )
        output = handler.wfile.getvalue().decode()
        assert "200" in output
        assert "X-Custom" in output
        assert "Content-Length: 4" in output
        assert "body" in output


class TestHandlerForwardRequest:
    """Tests for DexCompanionHandler._forward_request."""

    @patch.object(companion, "_build_connection")
    def test_successful_forward(self, mock_build_conn):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.getheaders.return_value = [("Content-Type", "text/plain")]
        mock_response.read.return_value = b"OK"

        mock_conn = MagicMock()
        mock_conn.getresponse.return_value = mock_response
        mock_build_conn.return_value = mock_conn

        handler = _make_handler("GET", "/dex/auth")
        status, headers, body = handler._forward_request(None, {})
        assert status == 200
        assert body == b"OK"
        mock_conn.close.assert_called_once()

    @patch.object(companion, "_build_connection")
    def test_upstream_unreachable(self, mock_build_conn):
        mock_conn = MagicMock()
        mock_conn.request.side_effect = OSError("Connection refused")
        mock_build_conn.return_value = mock_conn

        handler = _make_handler("GET", "/dex/auth")
        status, headers, body = handler._forward_request(None, {})
        assert status == 502
        assert b"dex_upstream_unreachable" in body
        mock_conn.close.assert_called_once()


# ===================================================================
# HTTP method handler tests
# ===================================================================


class TestHttpMethods:
    """Tests that all HTTP method handlers call _proxy."""

    @pytest.fixture()
    def patched_proxy(self):
        with patch.object(companion.DexCompanionHandler, "_proxy") as mock_proxy:
            yield mock_proxy

    @pytest.mark.parametrize(
        "method_name",
        ["do_GET", "do_POST", "do_PUT", "do_PATCH", "do_DELETE", "do_OPTIONS"],
    )
    def test_method_calls_proxy(self, patched_proxy, method_name):
        handler = _make_handler("GET", "/path")
        getattr(handler, method_name)()
        patched_proxy.assert_called_once()


class TestLogMessage:
    """Tests for log_message suppression."""

    def test_log_message_suppressed(self):
        handler = _make_handler("GET", "/path")
        result = handler.log_message("test %s", "arg")
        assert result is None


# ===================================================================
# Integration test: full proxy round-trip via real HTTP
# ===================================================================


class _FakeUpstreamHandler(BaseHTTPRequestHandler):
    """Fake upstream server that returns a configurable JSON response."""

    response_body = json.dumps(
        {
            "sub": "12345",
            "preferred_username": "alice",
            "iss": "http://localhost:19876/dex",
        }
    ).encode()

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(self.response_body)))
        self.end_headers()
        self.wfile.write(self.response_body)

    def log_message(self, format, *args):
        pass


class TestIntegrationProxy:
    """Integration test exercising the full proxy chain."""

    @pytest.fixture(autouse=True)
    def _servers(self):
        """Start a fake upstream and the companion proxy."""
        upstream = HTTPServer(("127.0.0.1", 0), _FakeUpstreamHandler)
        upstream_port = upstream.server_address[1]

        upstream_thread = threading.Thread(target=upstream.serve_forever, daemon=True)
        upstream_thread.start()

        upstream_url = f"http://127.0.0.1:{upstream_port}"

        with (
            patch.object(companion, "UPSTREAM", upstream_url),
            patch.object(companion, "BIND", "127.0.0.1"),
            patch.object(companion, "PORT", 0),
        ):
            proxy = companion.ThreadingHTTPServer(
                ("127.0.0.1", 0), companion.DexCompanionHandler
            )
            proxy_port = proxy.server_address[1]
            proxy_thread = threading.Thread(target=proxy.serve_forever, daemon=True)
            proxy_thread.start()

            self.proxy_port = proxy_port

            yield

            proxy.shutdown()
        upstream.shutdown()

    def test_userinfo_gets_profile_injected(self):
        import http.client

        conn = http.client.HTTPConnection("127.0.0.1", self.proxy_port)
        conn.request("GET", "/dex/userinfo")
        resp = conn.getresponse()
        body = json.loads(resp.read())
        assert resp.status == 200
        assert "profile" in body
        assert body["profile"] == "http://localhost:19876/dex/alice"
        conn.close()

    def test_non_userinfo_path_untouched(self):
        import http.client

        conn = http.client.HTTPConnection("127.0.0.1", self.proxy_port)
        conn.request("GET", "/dex/auth")
        resp = conn.getresponse()
        body = json.loads(resp.read())
        assert resp.status == 200
        assert "profile" not in body
        conn.close()


# ===================================================================
# main() test
# ===================================================================


class TestMain:
    """Tests for the main() entry point."""

    @patch.object(companion.ThreadingHTTPServer, "serve_forever")
    def test_main_starts_server(self, mock_serve):
        with patch("builtins.print") as mock_print:
            companion.main()
        mock_serve.assert_called_once()
        mock_print.assert_called_once()
        printed = mock_print.call_args[0][0]
        assert "dex-companion listening" in printed
