"""HTTP utility functions for URL handling and connections."""

from __future__ import annotations

from http.client import HTTPConnection, HTTPSConnection
from typing import Iterable
from urllib.parse import SplitResult, urlsplit, urlunsplit

from companion.src.config import (
    HOP_BY_HOP_HEADERS,
    UPSTREAM,
    UPSTREAM_TIMEOUT_SECONDS,
)


def normalize_target_url(path: str) -> str:
    """Build the full upstream URL for a given request path."""
    parsed = urlsplit(path)
    normalized_path = parsed.path or "/"
    upstream_path = urlunsplit(("", "", normalized_path, parsed.query, ""))
    return f"{UPSTREAM}{upstream_path}"


def split_target_url(path: str) -> SplitResult:
    """Parse the full upstream URL into components."""
    return urlsplit(normalize_target_url(path))


def target_path(parsed_target: SplitResult) -> str:
    """Extract the path and query from a parsed URL."""
    path = parsed_target.path or "/"
    return urlunsplit(("", "", path, parsed_target.query, ""))


def target_port(parsed_target: SplitResult) -> int:
    """Determine the port for the upstream connection."""
    if parsed_target.port is not None:
        return parsed_target.port
    if parsed_target.scheme == "https":
        return 443
    return 80


def build_connection(
    parsed_target: SplitResult,
) -> HTTPConnection | HTTPSConnection:
    """Create an HTTP(S) connection to the upstream server."""
    connection_type = (
        HTTPSConnection if parsed_target.scheme == "https" else HTTPConnection
    )
    return connection_type(
        parsed_target.hostname,
        target_port(parsed_target),
        timeout=UPSTREAM_TIMEOUT_SECONDS,
    )


def safe_content_length(raw_value: str | None) -> int:
    """Parse Content-Length, returning 0 for invalid values."""
    if not raw_value:
        return 0
    try:
        parsed = int(raw_value)
    except ValueError:
        return 0
    return max(parsed, 0)


def is_json_response(
    headers: Iterable[tuple[str, str]],
) -> bool:
    """Check whether response headers indicate JSON content."""
    for key, value in headers:
        if key.lower() == "content-type":
            return "application/json" in value.lower()
    return False


def should_forward_header(header_name: str) -> bool:
    """Decide whether a request header should be forwarded."""
    lower = header_name.lower()
    return lower != "host" and lower not in HOP_BY_HOP_HEADERS
