#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

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


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


NO_REDIRECT_OPENER = build_opener(NoRedirect)


def _normalize_target_url(path: str) -> str:
    parsed = urlsplit(path)
    normalized_path = parsed.path or "/"
    normalized_query = parsed.query
    return f"{UPSTREAM}{urlunsplit(("", "", normalized_path, normalized_query, ""))}"


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


def _inject_profile_claim(path: str, response_headers: list[tuple[str, str]], response_body: bytes) -> bytes:
    if not path.startswith("/dex/userinfo") or not _is_json_response(response_headers):
        return response_body

    try:
        payload = json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return response_body

    if not isinstance(payload, dict) or payload.get("profile"):
        return response_body

    preferred_username = payload.get("preferred_username")
    if not preferred_username:
        return response_body

    issuer = str(payload.get("iss") or "").rstrip("/")
    payload["profile"] = f"{issuer}/{preferred_username}" if issuer else f"/users/{preferred_username}"
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


class DexCompanionHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _proxy(self) -> None:
        request_body = self._read_request_body()
        request = Request(_normalize_target_url(self.path), data=request_body, method=self.command)
        self._copy_request_headers(request)

        status_code, response_headers, response_body = self._forward_request(request)
        response_body = _inject_profile_claim(self.path, response_headers, response_body)
        self._write_response(status_code, response_headers, response_body)

    def _read_request_body(self) -> bytes | None:
        content_length = _safe_content_length(self.headers.get("Content-Length"))
        if content_length == 0:
            return None
        return self.rfile.read(content_length)

    def _copy_request_headers(self, outbound_request: Request) -> None:
        for key, value in self.headers.items():
            header_name = key.lower()
            if header_name == "host" or header_name in HOP_BY_HOP_HEADERS:
                continue
            outbound_request.add_header(key, value)

    def _forward_request(self, request: Request) -> tuple[int, list[tuple[str, str]], bytes]:
        try:
            with NO_REDIRECT_OPENER.open(request, timeout=UPSTREAM_TIMEOUT_SECONDS) as response:
                return response.getcode(), list(response.getheaders()), response.read()
        except HTTPError as exc:
            return exc.code, list(exc.headers.items()), exc.read()
        except URLError:
            return 502, [("Content-Type", "application/json")], b'{"error":"dex_upstream_unreachable"}'

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
        self._proxy()

    def do_POST(self) -> None:  # noqa: N802
        self._proxy()

    def do_PUT(self) -> None:  # noqa: N802
        self._proxy()

    def do_PATCH(self) -> None:  # noqa: N802
        self._proxy()

    def do_DELETE(self) -> None:  # noqa: N802
        self._proxy()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._proxy()

    def log_message(self, format: str, *args) -> None:
        return


def main() -> None:
    server = ThreadingHTTPServer((BIND, PORT), DexCompanionHandler)
    print(f"dex-companion listening on {BIND}:{PORT}, upstream={UPSTREAM}")
    server.serve_forever()


if __name__ == "__main__":
    main()
