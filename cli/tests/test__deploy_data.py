"""Tests for the _deploy_data module: the LOGGER_URL resolver."""

import pytest
from src.pkg._deploy_data import resolve_logger_url

DNS = {"server-dns": "myserver.com"}


@pytest.mark.parametrize(
    "toml,expected",
    [
        ({"common": DNS}, "https://myserver.com/logger"),
        ({"common": DNS, "frontend": {}}, "https://myserver.com/logger"),
        (
            {"common": DNS, "frontend": {"logger-url": "https://logs.example.com"}},
            "https://logs.example.com",
        ),
        ({"common": DNS, "frontend": {"logger-url": ""}}, ""),
        ({"frontend": {"logger-url": ""}}, ""),
        ({}, None),
        ({"common": {"server-dns": " "}}, None),
    ],
    ids=[
        "no-frontend",
        "unset",
        "set",
        "empty",
        "empty-no-dns",
        "nothing",
        "blank-dns",
    ],
)
def test_resolve_logger_url(toml, expected):
    """A set logger-url wins, "" included (remote logging off); without it,
    this installation's logger, or None (keep the template) with no server-dns."""
    assert resolve_logger_url(toml, "https") == expected


def test_resolve_logger_url_uses_the_scheme():
    """The installation's logger is reached on the website's own scheme."""
    toml = {"common": DNS}
    assert resolve_logger_url(toml, "http") == "http://myserver.com/logger"
