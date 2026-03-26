# pylint: disable=missing-function-docstring,protected-access
# pylint: disable=too-few-public-methods
"""Tests for companion.src.handler module."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from companion.src import handler as handler_mod
from companion.src.handler import DexCompanionHandler


class TestHandlerReadRequestBody:
    """Tests for DexCompanionHandler._read_request_body."""

    def test_no_content_length(self, make_handler):
        handler = make_handler("GET", "/path")
        assert handler._read_request_body() is None

    def test_with_body(self, make_handler):
        body = b"hello"
        handler = make_handler(
            "POST",
            "/path",
            body=body,
            headers={"Content-Type": "text/plain"},
        )
        assert handler._read_request_body() == body


class TestHandlerCopyRequestHeaders:
    """Tests for DexCompanionHandler._copy_request_headers."""

    def test_filters_hop_by_hop_and_host(self, make_handler):
        handler = make_handler(
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

    def test_writes_response(self, make_handler):
        handler = make_handler("GET", "/path")
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

    @patch.object(handler_mod, "build_connection")
    def test_successful_forward(
        self,
        mock_build_conn,
        make_handler,
    ):
        """Verify successful upstream forwarding."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.getheaders.return_value = [
            ("Content-Type", "text/plain"),
        ]
        mock_response.read.return_value = b"OK"

        mock_conn = MagicMock()
        mock_conn.getresponse.return_value = mock_response
        mock_build_conn.return_value = mock_conn

        handler = make_handler("GET", "/dex/auth")
        status, _, body = handler._forward_request(None, {})
        assert status == 200
        assert body == b"OK"
        mock_conn.close.assert_called_once()

    @patch.object(handler_mod, "build_connection")
    def test_upstream_unreachable(
        self,
        mock_build_conn,
        make_handler,
    ):
        """Verify 502 response when upstream is unreachable."""
        mock_conn = MagicMock()
        mock_conn.request.side_effect = OSError(
            "Connection refused",
        )
        mock_build_conn.return_value = mock_conn

        handler = make_handler("GET", "/dex/auth")
        status, _, body = handler._forward_request(None, {})
        assert status == 502
        assert b"dex_upstream_unreachable" in body
        mock_conn.close.assert_called_once()

    @patch.object(handler_mod, "split_target_url")
    def test_invalid_upstream_url(
        self,
        mock_split,
        make_handler,
    ):
        """Verify 502 response when parsed URL has no hostname."""
        mock_parsed = MagicMock()
        mock_parsed.hostname = None
        mock_split.return_value = mock_parsed

        handler = make_handler("GET", "/bad-path")
        status, _, body = handler._forward_request(None, {})
        assert status == 502
        assert b"invalid_upstream_url" in body


class TestHttpMethods:
    """Tests that all HTTP method handlers call _proxy."""

    @pytest.fixture()
    def patched_proxy(self):
        """Patch _proxy method for isolation."""
        with patch.object(
            DexCompanionHandler,
            "_proxy",
        ) as mock_proxy:
            yield mock_proxy

    @pytest.mark.parametrize(
        "method_name",
        [
            "do_GET",
            "do_POST",
            "do_PUT",
            "do_PATCH",
            "do_DELETE",
            "do_OPTIONS",
        ],
    )
    def test_method_calls_proxy(
        self,
        patched_proxy,
        make_handler,
        method_name,
    ):
        handler = make_handler("GET", "/path")
        getattr(handler, method_name)()
        patched_proxy.assert_called_once()


class TestLogMessage:
    """Tests for log_message suppression."""

    def test_log_message_suppressed(self, make_handler):
        handler = make_handler("GET", "/path")
        result = handler.log_message("test %s", "arg")
        assert result is None
