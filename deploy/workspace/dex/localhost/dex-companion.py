#!/usr/bin/env python3
# pylint: disable=invalid-name

"""Reverse proxy helper for Dex local passwordDB mode."""

from __future__ import annotations

import json
import os
from http.client import HTTPConnection, HTTPSConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Iterable
from urllib.parse import SplitResult, urlsplit, urlunsplit

UPSTREAM = os.environ.get("DEX_UPSTREAM", "http://dex:5556").rstrip("/")
BIND = os.environ.get("COMPANION_BIND", "0.0.0.0")
PORT = int(os.environ.get("COMPANION_PORT", "5556"))
UPSTREAM_TIMEOUT_SECONDS = 30

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
}

RESPONSE_HEADERS_TO_SUPPRESS = HOP_BY_HOP_HEADERS | {"server", "date"}


def _normalize_target_url(path: str) -> str:
    parsed = urlsplit(path)
    normalized_path = parsed.path or "/"
    normalized_query = parsed.query
    upstream_path = urlunsplit(("", "", normalized_path, normalized_query, ""))
    return f"{UPSTREAM}{upstream_path}"


def _split_target_url(path: str) -> SplitResult:
    return urlsplit(_normalize_target_url(path))


def _target_path(parsed_target: SplitResult) -> str:
    return urlunsplit(("", "", parsed_target.path or "/", parsed_target.query, ""))


def _target_port(parsed_target: SplitResult) -> int:
    if parsed_target.port is not None:
        return parsed_target.port
    if parsed_target.scheme == "https":
        return 443
    return 80


def _build_connection(
    parsed_target: SplitResult,
) -> HTTPConnection | HTTPSConnection:
    connection_type = (
        HTTPSConnection if parsed_target.scheme == "https" else HTTPConnection
    )
    return connection_type(
        parsed_target.hostname,
        _target_port(parsed_target),
        timeout=UPSTREAM_TIMEOUT_SECONDS,
    )


def _safe_content_length(raw_value: str | None) -> int:
    if not raw_value:
        return 0
    try:
        parsed = int(raw_value)
    except ValueError:
        return 0
    return max(parsed, 0)


def _is_json_response(headers: Iterable[tuple[str, str]]) -> bool:
    for key, value in headers:
        if key.lower() == "content-type":
            return "application/json" in value.lower()
    return False


def _decode_json_object(
    response_body: bytes,
) -> dict[str, object] | None:
    payload: object | None = None
    try:
        payload = json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    if isinstance(payload, dict):
        return payload
    return None


def _build_profile_claim(
    payload: dict[str, object] | None,
) -> str | None:
    preferred_username = None
    issuer = ""
    if isinstance(payload, dict):
        preferred_username = payload.get("preferred_username")
        issuer = str(payload.get("iss") or "").rstrip("/")
    if not isinstance(preferred_username, str) or not preferred_username:
        return None
    if issuer:
        return f"{issuer}/{preferred_username}"
    return f"/users/{preferred_username}"


def _inject_profile_claim(
    path: str,
    response_headers: list[tuple[str, str]],
    response_body: bytes,
) -> bytes:
    payload = None
    profile_claim = None
    should_check = path.startswith("/dex/userinfo")
    should_check = should_check and _is_json_response(response_headers)
    if should_check:
        payload = _decode_json_object(response_body)
        profile_claim = _build_profile_claim(payload)

    should_inject = isinstance(payload, dict)
    should_inject = should_inject and not payload.get("profile")
    should_inject = should_inject and profile_claim is not None
    if should_inject:
        payload["profile"] = profile_claim
        return json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return response_body


def _should_forward_header(header_name: str) -> bool:
    normalized_name = header_name.lower()
    return normalized_name != "host" and normalized_name not in HOP_BY_HOP_HEADERS


class DexCompanionHandler(BaseHTTPRequestHandler):
    """Proxy HTTP requests to Dex and adjust userinfo responses."""

    protocol_version = "HTTP/1.1"

    def _proxy(self) -> None:
        request_body = self._read_request_body()
        request_headers = self._copy_request_headers()
        status_code, response_headers, response_body = self._forward_request(
            request_body,
            request_headers,
        )
        response_body = _inject_profile_claim(
            self.path,
            response_headers,
            response_body,
        )
        self._write_response(status_code, response_headers, response_body)

    def _read_request_body(self) -> bytes | None:
        content_length = _safe_content_length(self.headers.get("Content-Length"))
        if content_length == 0:
            return None
        return self.rfile.read(content_length)

    def _copy_request_headers(self) -> dict[str, str]:
        return {
            key: value
            for key, value in self.headers.items()
            if _should_forward_header(key)
        }

    def _forward_request(
        self,
        request_body: bytes | None,
        request_headers: dict[str, str],
    ) -> tuple[int, list[tuple[str, str]], bytes]:
        parsed_target = _split_target_url(self.path)
        connection = _build_connection(parsed_target)
        try:
            connection.request(
                self.command,
                _target_path(parsed_target),
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
        self.send_response(status_code)
        for key, value in response_headers:
            if key.lower() in RESPONSE_HEADERS_TO_SUPPRESS:
                continue
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def do_GET(self) -> None:  # noqa: N802
        """Proxy HTTP GET requests to Dex."""
        self._proxy()

    def do_POST(self) -> None:  # noqa: N802
        """Proxy HTTP POST requests to Dex."""
        self._proxy()

    def do_PUT(self) -> None:  # noqa: N802
        """Proxy HTTP PUT requests to Dex."""
        self._proxy()

    def do_PATCH(self) -> None:  # noqa: N802
        """Proxy HTTP PATCH requests to Dex."""
        self._proxy()

    def do_DELETE(self) -> None:  # noqa: N802
        """Proxy HTTP DELETE requests to Dex."""
        self._proxy()

    def do_OPTIONS(self) -> None:  # noqa: N802
        """Proxy HTTP OPTIONS requests to Dex."""
        self._proxy()

    # pylint: disable=arguments-differ,redefined-builtin,unused-argument
    def log_message(self, format: str, *args) -> None:
        """Suppress the default HTTP server request logging."""
        return


def main() -> None:
    """Start the companion HTTP server."""
    server = ThreadingHTTPServer((BIND, PORT), DexCompanionHandler)
    print(f"dex-companion listening on {BIND}:{PORT}, upstream={UPSTREAM}")
    server.serve_forever()


if __name__ == "__main__":
    main()
