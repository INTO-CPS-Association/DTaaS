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
HTTP_LOGGER = "http://logs.example.com/logger"
NO_PATH = "https://logs.example.com/"
UNSET = "Warning: frontend.logger-url is not set"
EMPTY = "Warning: frontend.logger-url is empty"
EXAMPLE = "Warning: frontend.logger-url is the template example"
PATH = "Warning: frontend.logger-url does not end in /logger"
MIXED = "Warning: frontend.logger-url is http on an https site"
NOT_URL = "frontend.logger-url must be a valid URL, or empty to turn it off"


def _toml(frontend):
    """A dtaas.toml with *frontend* as its [frontend] section."""
    return {"common": {"server-dns": "myserver.com"}, "frontend": frontend}


def _assert_warnings(warnings, summaries, detail):
    """Each warning opens with its summary, then indented detail naming *detail*."""
    assert [w.splitlines()[0] for w in warnings] == summaries
    for warning in warnings:
        lines = warning.splitlines()[1:]
        assert detail in "\n".join(lines)
        assert all(line.startswith(" ") for line in lines)


@pytest.mark.parametrize(
    "frontend,errors",
    [
        ({}, []),
        ({"logger-url": LOGGER}, []),
        ({"logger-url": ""}, []),
        ({"logger-url": "  "}, [NOT_URL]),
        ({"logger-url": f" {LOGGER} "}, [NOT_URL]),
        ({"logger-url": "not a url"}, [NOT_URL]),
        ({"logger-url": 0}, [NOT_URL]),
    ],
    ids=["unset", "url", "empty", "blank", "padded", "not-a-url", "number"],
)
def test_check_logger_url(frontend, errors):
    """logger-url may be left out, and is otherwise a URL or exactly empty."""
    assert check_logger_url(_toml(frontend)) == errors


@pytest.mark.parametrize(
    "frontend,summaries,detail",
    [
        ({}, [UNSET], "http(s)://myserver.com/logger"),
        ({"logger-url": ""}, [EMPTY], "Remote logging is off"),
        ({"logger-url": TEMPLATE_EXAMPLE}, [EXAMPLE], TEMPLATE_EXAMPLE),
        ({"logger-url": NO_PATH}, [PATH], NO_PATH),
        ({"logger-url": f"{LOGGER}/"}, [PATH], f"{LOGGER}/"),
        ({"logger-url": LOGGER}, [], None),
        ({"logger-url": HTTP_LOGGER}, [], None),
        ({"logger-url": " "}, [], None),
        ({"logger-url": 0}, [], None),
        ({"logger-url": ["x"]}, [], None),
    ],
    ids=[
        "unset",
        "empty",
        "example",
        "no-path",
        "trailing-slash",
        "set",
        "http",
        "blank",
        "number",
        "list",
    ],
)
def test_validate_warnings(frontend, summaries, detail):
    """validate warns while logger-url is missing, empty, the template's
    example, or off the /logger path; an invalid value gets its error alone."""
    _assert_warnings(validate_warnings(_toml(frontend)), summaries, detail)


def test_validate_warnings_need_a_frontend_section():
    """A dtaas.toml with no [frontend] (localhost, workspace) gets no warning."""
    assert not validate_warnings({"common": {"server-dns": "myserver.com"}})


@pytest.mark.parametrize(
    "deploy_type,frontend,summaries,detail",
    [
        ("secure-server", {}, [UNSET], "LOGGER_URL is https://myserver.com/logger"),
        ("insecure-server", {}, [UNSET], "LOGGER_URL is http://myserver.com/logger"),
        ("secure-server", {"logger-url": ""}, [EMPTY], "Remote logging is off"),
        (
            "secure-server",
            {"logger-url": TEMPLATE_EXAMPLE},
            [EXAMPLE],
            TEMPLATE_EXAMPLE,
        ),
        ("secure-server", {"logger-url": NO_PATH}, [PATH], NO_PATH),
        ("secure-server", {"logger-url": HTTP_LOGGER}, [MIXED], HTTP_LOGGER),
        ("secure-server-gitlab", {"logger-url": HTTP_LOGGER}, [MIXED], HTTP_LOGGER),
        (
            "secure-server",
            {"logger-url": "HTTP://a.org"},
            [PATH, MIXED],
            "HTTP://a.org",
        ),
        ("insecure-server", {"logger-url": HTTP_LOGGER}, [], None),
        ("insecure-server", {"logger-url": LOGGER}, [], None),
        ("secure-server", {"logger-url": LOGGER}, [], None),
        ("localhost", {}, [], None),
        ("localhost", {"logger-url": ""}, [], None),
    ],
    ids=[
        "https",
        "http",
        "empty",
        "example",
        "no-path",
        "mixed",
        "mixed-gitlab",
        "mixed-no-path",
        "insecure-http",
        "insecure-https",
        "set",
        "localhost",
        "localhost-empty",
    ],
)
def test_generate_warnings(deploy_type, frontend, summaries, detail):
    """generate warns like validate, naming the LOGGER_URL it wrote, only for
    the types that write one, and also on an http logger for an https site."""
    data = _toml(frontend)
    warnings = generate_warnings(data, build_file_specs(deploy_type, data))
    _assert_warnings(warnings, summaries, detail)
