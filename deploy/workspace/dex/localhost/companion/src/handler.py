"""HTTP request handler that proxies to Dex upstream."""

# pylint: disable=C0103

from __future__ import annotations

from http.server import BaseHTTPRequestHandler

from companion.src.config import RESPONSE_HEADERS_TO_SUPPRESS
from companion.src.http_utils import (
    build_connection,
    safe_content_length,
    should_forward_header,
    split_target_url,
    target_path,
)
from companion.src.profile import inject_profile_claim


class DexCompanionHandler(BaseHTTPRequestHandler):
    """Proxy HTTP requests to Dex and adjust userinfo."""

    protocol_version = "HTTP/1.1"

    def _proxy(self) -> None:
        """Forward request to upstream and send response."""
        request_body = self._read_request_body()
        request_headers = self._copy_request_headers()
        status_code, resp_headers, resp_body = self._forward_request(
            request_body, request_headers
        )
        resp_body = inject_profile_claim(
            self.path,
            resp_headers,
            resp_body,
        )
        self._write_response(
            status_code,
            resp_headers,
            resp_body,
        )

    def _read_request_body(self) -> bytes | None:
        """Read the request body based on Content-Length."""
        length = safe_content_length(self.headers.get("Content-Length"))
        if length == 0:
            return None
        return self.rfile.read(length)

    def _copy_request_headers(self) -> dict[str, str]:
        """Copy headers, excluding hop-by-hop and Host."""
        return {
            key: value
            for key, value in self.headers.items()
            if should_forward_header(key)
        }

    def _forward_request(
        self,
        request_body: bytes | None,
        request_headers: dict[str, str],
    ) -> tuple[int, list[tuple[str, str]], bytes]:
        """Send the request to upstream and return result."""
        parsed = split_target_url(self.path)
        if not parsed.hostname:
            return (
                502,
                [("Content-Type", "application/json")],
                b'{"error":"invalid_upstream_url"}',
            )
        connection = build_connection(parsed)
        try:
            connection.request(
                self.command,
                target_path(parsed),
                body=request_body,
                headers=request_headers,
            )
            response = connection.getresponse()
            return (
                response.status,
                list(response.getheaders()),
                response.read(),
            )
        except OSError:
            return (
                502,
                [("Content-Type", "application/json")],
                b'{"error":"dex_upstream_unreachable"}',
            )
        finally:
            connection.close()

    def _write_response(
        self,
        status_code: int,
        response_headers: list[tuple[str, str]],
        response_body: bytes,
    ) -> None:
        """Write the proxied response back to the client."""
        self.send_response(status_code)
        for key, value in response_headers:
            if key.lower() in RESPONSE_HEADERS_TO_SUPPRESS:
                continue
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def do_GET(self) -> None:
        """Proxy HTTP GET requests to Dex."""
        self._proxy()

    def do_POST(self) -> None:
        """Proxy HTTP POST requests to Dex."""
        self._proxy()

    def do_PUT(self) -> None:
        """Proxy HTTP PUT requests to Dex."""
        self._proxy()

    def do_PATCH(self) -> None:
        """Proxy HTTP PATCH requests to Dex."""
        self._proxy()

    def do_DELETE(self) -> None:
        """Proxy HTTP DELETE requests to Dex."""
        self._proxy()

    def do_OPTIONS(self) -> None:
        """Proxy HTTP OPTIONS requests to Dex."""
        self._proxy()

    def log_message(self, *_args) -> None:
        """Suppress the default HTTP server request logging."""
