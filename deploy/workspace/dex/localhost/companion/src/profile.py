"""Profile claim construction and injection for userinfo."""

from __future__ import annotations

import json

from companion.src.http_utils import is_json_response


def decode_json_object(
    response_body: bytes,
) -> dict[str, object] | None:
    """Decode bytes into a JSON dict, or return None."""
    try:
        payload = json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    if isinstance(payload, dict):
        return payload
    return None


def build_profile_claim(
    payload: dict[str, object] | None,
) -> str | None:
    """Build a profile URL from preferred_username and issuer."""
    if not isinstance(payload, dict):
        return None
    preferred_username = payload.get("preferred_username")
    if not isinstance(preferred_username, str) or not preferred_username:
        return None
    issuer = str(payload.get("iss") or "").rstrip("/")
    base = issuer if issuer else "/users"
    return f"{base}/{preferred_username}"


def inject_profile_claim(
    path: str,
    response_headers: list[tuple[str, str]],
    response_body: bytes,
) -> bytes:
    """Add a profile claim to userinfo JSON when missing."""
    is_userinfo = path.startswith("/dex/userinfo")
    if not is_userinfo or not is_json_response(response_headers):
        return response_body

    payload = decode_json_object(response_body)
    profile_claim = build_profile_claim(payload)

    can_inject = isinstance(payload, dict)
    can_inject = can_inject and not payload.get("profile")
    can_inject = can_inject and profile_claim is not None
    if not can_inject:
        return response_body

    payload["profile"] = profile_claim
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")
