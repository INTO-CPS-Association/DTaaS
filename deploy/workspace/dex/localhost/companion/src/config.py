"""Configuration constants for the Dex companion proxy."""

import os

UPSTREAM = os.environ.get("DEX_UPSTREAM", "http://dex:5556").rstrip("/")  # NOSONAR
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
