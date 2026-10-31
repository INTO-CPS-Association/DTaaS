"""Tests for the config_validate_frontend module."""

import pytest
from src.pkg.config_validate_frontend import (
    TEMPLATE_EXAMPLE,
    check_logger_url,
    generate_warnings,
    validate_warnings,
)
from src.pkg.deploy_config import build_file_specs

LOGGER = "https://logs.example.com/logger"
UNSET = "Warning: frontend.logger-url is not set"
EMPTY = "Warning: frontend.logger-url is empty"
EXAMPLE = "Warning: frontend.logger-url is the template example"
NOT_URL = "frontend.logger-url must be a valid URL, or empty to turn it off"


def _toml(frontend):
    """A dtaas.toml with *frontend* as its [frontend] section."""
    return {"common": {"server-dns": "myserver.com"}, "frontend": frontend}


@pytest.mark.parametrize(
    "frontend,errors",
    [
        ({}, []),
        ({"logger-url": LOGGER}, []),
        ({"logger-url": ""}, []),
        ({"logger-url": "not a url"}, [NOT_URL]),
        ({"logger-url": 0}, [NOT_URL]),
    ],
    ids=["unset", "url", "empty", "not-a-url", "number"],
)
def test_check_logger_url(frontend, errors):
    """logger-url may be left out, and is otherwise a URL or empty."""
    assert check_logger_url(_toml(frontend)) == errors


@pytest.mark.parametrize(
    "frontend,summary,detail",
    [
        ({}, UNSET, "http(s)://myserver.com/logger"),
        ({"logger-url": ""}, EMPTY, "Remote logging is off"),
        ({"logger-url": " "}, EMPTY, "Remote logging is off"),
        ({"logger-url": TEMPLATE_EXAMPLE}, EXAMPLE, TEMPLATE_EXAMPLE),
        ({"logger-url": LOGGER}, None, None),
        ({"logger-url": 0}, None, None),
    ],
    ids=["unset", "empty", "blank", "example", "set", "invalid"],
)
def test_validate_warnings(frontend, summary, detail):
    """validate warns while logger-url is missing, empty or the template's
    example: one short line, its detail indented underneath."""
    warnings = validate_warnings(_toml(frontend))
    assert [w.splitlines()[0] for w in warnings] == ([summary] if summary else [])
    for warning in warnings:
        lines = warning.splitlines()[1:]
        assert detail in lines[0]
        assert all(line.startswith(" ") for line in lines)


def test_validate_warnings_need_a_frontend_section():
    """A dtaas.toml with no [frontend] (localhost, workspace) gets no warning."""
    assert not validate_warnings({"common": {"server-dns": "myserver.com"}})


@pytest.mark.parametrize(
    "deploy_type,frontend,summary,detail",
    [
        ("secure-server", {}, UNSET, "LOGGER_URL is https://myserver.com/logger"),
        ("insecure-server", {}, UNSET, "LOGGER_URL is http://myserver.com/logger"),
        ("secure-server", {"logger-url": ""}, EMPTY, "Remote logging is off"),
        ("secure-server", {"logger-url": TEMPLATE_EXAMPLE}, EXAMPLE, TEMPLATE_EXAMPLE),
        ("secure-server", {"logger-url": LOGGER}, None, None),
        ("localhost", {}, None, None),
        ("localhost", {"logger-url": ""}, None, None),
    ],
    ids=["https", "http", "empty", "example", "set", "localhost", "localhost-empty"],
)
def test_generate_warnings(deploy_type, frontend, summary, detail):
    """generate warns like validate, naming the LOGGER_URL it wrote, and only
    for the types that write one."""
    data = _toml(frontend)
    warnings = generate_warnings(data, build_file_specs(deploy_type, data))
    assert [w.splitlines()[0] for w in warnings] == ([summary] if summary else [])
    assert all(detail in w for w in warnings)
