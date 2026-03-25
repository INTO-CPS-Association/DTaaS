"""Configuration constants for the Dex companion proxy."""

from __future__ import annotations

import os
import sys


def _parse_port(raw_value: str | None, default: int = 5556) -> int:
    """Safely parse a port number, falling back to *default*."""
    if raw_value is None or raw_value == "":
        return default
    try:
        return int(raw_value)
    except ValueError:
        port_error = (
            f"Invalid COMPANION_PORT value {raw_value!r},"
            f" falling back to {default}"
        )
        print(port_error, file=sys.stderr)
        return default


UPSTREAM = os.environ.get(
    "DEX_UPSTREAM",
    "http://dex:5556",  # NOSONAR
).rstrip("/")
BIND = os.environ.get("COMPANION_BIND", "0.0.0.0")
PORT = _parse_port(os.environ.get("COMPANION_PORT"))
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
