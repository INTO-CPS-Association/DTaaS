# pylint: disable=missing-function-docstring,too-few-public-methods
# pylint: disable=attribute-defined-outside-init
# pylint: disable=import-outside-toplevel
"""Integration tests for the full companion proxy chain."""

from __future__ import annotations

import http.client
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

from companion.src import http_utils
from companion.src.handler import DexCompanionHandler

FAKE_RESPONSE = json.dumps(
    {
        "sub": "12345",
        "preferred_username": "alice",
        "iss": "http://localhost:19876/dex",
    }
).encode()


class _FakeUpstreamHandler(BaseHTTPRequestHandler):
    """Fake upstream returning a fixed JSON response."""

    def do_GET(self):  # pylint: disable=C0103
        """Handle GET with a canned userinfo response."""
        self.send_response(200)
        self.send_header(
            "Content-Type",
            "application/json",
        )
        self.send_header(
            "Content-Length",
            str(len(FAKE_RESPONSE)),
        )
        self.end_headers()
        self.wfile.write(FAKE_RESPONSE)

    def log_message(self, *_args) -> None:
        """Suppress request logging."""


class TestIntegrationProxy:
    """Integration test exercising the full proxy chain."""

    def setup_method(self):
        """Start fake upstream and companion proxy."""
        self.upstream = HTTPServer(
            ("127.0.0.1", 0),
            _FakeUpstreamHandler,
        )
        upstream_port = self.upstream.server_address[1]
        self.upstream_thread = threading.Thread(
            target=self.upstream.serve_forever,
            daemon=True,
        )
        self.upstream_thread.start()

        upstream_url = f"http://127.0.0.1:{upstream_port}"
        self._patches = [
            patch.object(
                http_utils,
                "UPSTREAM",
                upstream_url,
            ),
        ]
        for patcher in self._patches:
            patcher.start()

        from http.server import ThreadingHTTPServer

        self.proxy = ThreadingHTTPServer(
            ("127.0.0.1", 0),
            DexCompanionHandler,
        )
        self.proxy_port = self.proxy.server_address[1]
        self.proxy_thread = threading.Thread(
            target=self.proxy.serve_forever,
            daemon=True,
        )
        self.proxy_thread.start()

    def teardown_method(self):
        """Shut down servers and restore patches."""
        self.proxy.shutdown()
        for patcher in self._patches:
            patcher.stop()
        self.upstream.shutdown()

    def test_userinfo_gets_profile_injected(self):
        conn = http.client.HTTPConnection(
            "127.0.0.1",
            self.proxy_port,
        )
        conn.request("GET", "/dex/userinfo")
        resp = conn.getresponse()
        body = json.loads(resp.read())
        assert resp.status == 200
        assert body["profile"] == ("http://localhost:19876/dex/alice")
        conn.close()

    def test_non_userinfo_path_untouched(self):
        conn = http.client.HTTPConnection(
            "127.0.0.1",
            self.proxy_port,
        )
        conn.request("GET", "/dex/auth")
        resp = conn.getresponse()
        body = json.loads(resp.read())
        assert resp.status == 200
        assert "profile" not in body
        conn.close()


class TestMain:
    """Tests for the main() entry point."""

    def test_main_starts_server(self):
        """Verify main() starts the HTTP server."""
        from http.server import ThreadingHTTPServer

        with (
            patch.object(
                ThreadingHTTPServer,
                "serve_forever",
            ) as mock_serve,
            patch("builtins.print") as mock_print,
        ):
            from companion.src.__main__ import main

            main()
        mock_serve.assert_called_once()
        mock_print.assert_called_once()
        printed = mock_print.call_args[0][0]
        assert "dex-companion listening" in printed
