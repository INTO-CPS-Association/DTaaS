# pylint: disable=missing-function-docstring
"""Tests for companion.src.profile module."""

from __future__ import annotations

import json

from companion.src.profile import (
    build_profile_claim,
    decode_json_object,
    inject_profile_claim,
)


class TestDecodeJsonObject:
    """Tests for decode_json_object."""

    def test_valid_json_dict(self):
        body = json.dumps({"key": "value"}).encode()
        result = decode_json_object(body)
        assert result == {"key": "value"}

    def test_json_array_returns_none(self):
        body = json.dumps([1, 2, 3]).encode()
        assert decode_json_object(body) is None

    def test_invalid_json_returns_none(self):
        assert decode_json_object(b"not json") is None

    def test_invalid_utf8_returns_none(self):
        assert decode_json_object(b"\xff\xfe") is None


class TestBuildProfileClaim:
    """Tests for build_profile_claim."""

    def test_with_issuer_and_username(self):
        payload = {
            "preferred_username": "alice",
            "iss": "http://dex:5556/dex",  # NOSONAR
        }
        result = build_profile_claim(payload)
        assert result == "http://dex:5556/dex/alice"  # NOSONAR

    def test_without_issuer(self):
        payload = {"preferred_username": "bob"}
        result = build_profile_claim(payload)
        assert result == "/users/bob"

    def test_missing_username(self):
        payload = {"iss": "http://dex:5556/dex"}  # NOSONAR
        assert build_profile_claim(payload) is None

    def test_empty_username(self):
        payload = {"preferred_username": ""}
        assert build_profile_claim(payload) is None

    def test_non_string_username(self):
        payload = {"preferred_username": 123}
        assert build_profile_claim(payload) is None

    def test_none_payload(self):
        assert build_profile_claim(None) is None

    def test_issuer_trailing_slash_stripped(self):
        payload = {
            "preferred_username": "alice",
            "iss": "http://dex:5556/dex/",  # NOSONAR
        }
        result = build_profile_claim(payload)
        assert result == "http://dex:5556/dex/alice"  # NOSONAR


class TestInjectProfileClaim:
    """Tests for inject_profile_claim."""

    def test_injects_profile_on_userinfo_path(self):
        body = json.dumps(
            {
                "preferred_username": "alice",
                "iss": "http://dex:5556/dex",  # NOSONAR
            }
        ).encode()
        headers = [("Content-Type", "application/json")]
        result = inject_profile_claim(
            "/dex/userinfo",
            headers,
            body,
        )
        parsed = json.loads(result)
        assert parsed["profile"] == "http://dex:5556/dex/alice"  # NOSONAR

    def test_does_not_inject_on_other_paths(self):
        body = json.dumps(
            {"preferred_username": "alice"},
        ).encode()
        headers = [("Content-Type", "application/json")]
        result = inject_profile_claim(
            "/dex/token",
            headers,
            body,
        )
        assert result == body

    def test_does_not_inject_on_prefix_match_path(self):
        body = json.dumps(
            {"preferred_username": "alice"},
        ).encode()
        headers = [("Content-Type", "application/json")]
        result = inject_profile_claim(
            "/dex/userinfo-foo",
            headers,
            body,
        )
        assert result == body

    def test_injects_on_userinfo_with_query_string(self):
        body = json.dumps(
            {
                "preferred_username": "alice",
                "iss": "http://dex:5556/dex",  # NOSONAR
            }
        ).encode()
        headers = [("Content-Type", "application/json")]
        result = inject_profile_claim(
            "/dex/userinfo?access_token=abc",
            headers,
            body,
        )
        parsed = json.loads(result)
        assert parsed["profile"] == "http://dex:5556/dex/alice"  # NOSONAR

    def test_does_not_inject_if_non_json(self):
        body = json.dumps(
            {"preferred_username": "alice"},
        ).encode()
        headers = [("Content-Type", "text/html")]
        result = inject_profile_claim(
            "/dex/userinfo",
            headers,
            body,
        )
        assert result == body

    def test_preserves_existing_profile(self):
        body = json.dumps(
            {
                "preferred_username": "alice",
                "profile": "existing",
            }
        ).encode()
        headers = [("Content-Type", "application/json")]
        result = inject_profile_claim(
            "/dex/userinfo",
            headers,
            body,
        )
        parsed = json.loads(result)
        assert parsed["profile"] == "existing"

    def test_no_username_no_injection(self):
        body = json.dumps({"sub": "12345"}).encode()
        headers = [("Content-Type", "application/json")]
        result = inject_profile_claim(
            "/dex/userinfo",
            headers,
            body,
        )
        assert result == body

    def test_invalid_json_body_returns_unchanged(self):
        body = b"not json"
        headers = [("Content-Type", "application/json")]
        result = inject_profile_claim(
            "/dex/userinfo",
            headers,
            body,
        )
        assert result == body
