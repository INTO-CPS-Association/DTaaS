# pylint: disable=missing-function-docstring
"""Shared test fixtures for companion tests."""

from __future__ import annotations

import io
from unittest.mock import MagicMock

import pytest

from companion.src.handler import DexCompanionHandler


@pytest.fixture(name="make_handler")
def fixture_make_handler():
    """Return a factory that builds a handler without a socket."""

    def _factory(
        method: str = "GET",
        path: str = "/dex/userinfo",
        body: bytes = b"",
        headers: dict[str, str] | None = None,
    ) -> DexCompanionHandler:
        if headers is None:
            headers = {}
        header_lines = "".join(f"{k}: {v}\r\n" for k, v in headers.items())
        if body:
            header_lines += f"Content-Length: {len(body)}\r\n"
        request_line = f"{method} {path} HTTP/1.1\r\n"
        header_block = f"Host: localhost\r\n{header_lines}\r\n"
        raw = f"{request_line}{header_block}".encode() + body

        rfile = io.BytesIO(raw)
        wfile = io.BytesIO()

        handler = DexCompanionHandler.__new__(
            DexCompanionHandler,
        )
        handler.rfile = rfile
        handler.wfile = wfile
        handler.client_address = ("127.0.0.1", 9999)
        handler.server = MagicMock()
        handler.raw_requestline = rfile.readline()
        handler.parse_request()
        return handler

    return _factory
