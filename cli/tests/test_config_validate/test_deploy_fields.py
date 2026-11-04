"""Tests for the deployment section checks of config_validate."""

import copy
import pytest
from src.pkg.config_validate import collect_errors


def test_deploy_sections_are_optional(base):
    """Deployment sections are validated only when present."""
    assert collect_errors(base) == []  # base has no deployment sections


def test_deploy_urls_validated(base):
    """URL fields in deployment sections must be valid URLs."""
    data = copy.deepcopy(base)
    data["frontend"] = {"react-app-oauth-url": "https:s/£@/gitlab.com"}
    data["workspace-localhost"] = {"auth-authority": "http://localhost:5556/dex"}
    errors = collect_errors(data)
    assert "frontend.react-app-oauth-url must be a valid URL" in errors
    # An http localhost authority with a port is a valid URL.
    assert "workspace-localhost.auth-authority must be a valid URL" not in errors


def test_deploy_username_validated(base):
    """default-user fields must be valid usernames."""
    data = copy.deepcopy(base)
    data["localhost"] = {
        "default-user": "bad user",
        "auth-authority": "https://gitlab.com/",
    }
    errors = collect_errors(data)
    assert "localhost.default-user must be a valid username" in errors
    assert "localhost.auth-authority must be a valid URL" not in errors


def test_secure_server_gitlab_oauth_url_validated(base):
    """secure-server-gitlab.oauth-url is checked like the other server types."""
    data = copy.deepcopy(base)
    data["secure-server-gitlab"] = {"oauth-url": "not a url"}
    assert "secure-server-gitlab.oauth-url must be a valid URL" in collect_errors(data)


def test_deploy_type_scope_skips_other_sections(base):
    """With a deploy_type, a leftover unrelated section is not validated.

    Mirrors 'update --config' for a secure-server deployment: a stale
    [workspace-secure-server] block with a bad URL must not block the update.
    """
    data = copy.deepcopy(base)
    data["workspace-secure-server"] = {"keycloak-issuer-url": "not a url"}
    data["secure-server"] = {"oauth-url": "https://gitlab.com/"}

    scoped = collect_errors(data, deploy_type="secure-server")
    assert scoped == []
    # Standalone 'config validate' (no deploy_type) still flags it.
    assert (
        "workspace-secure-server.keycloak-issuer-url must be a valid URL"
        in collect_errors(data)
    )


def test_deploy_type_scope_still_checks_own_section_and_shared(base):
    """A scoped validation still checks its own section and shared [frontend]."""
    data = copy.deepcopy(base)
    data["secure-server"] = {"oauth-url": "not a url"}
    data["frontend"] = {"react-app-oauth-url": "also not a url"}

    errors = collect_errors(data, deploy_type="secure-server")
    assert "secure-server.oauth-url must be a valid URL" in errors
    assert "frontend.react-app-oauth-url must be a valid URL" in errors


def test_deploy_placeholder_host_with_underscore_flagged(base):
    """Strict URL checking flags the template's your_server_dns placeholder."""
    data = copy.deepcopy(base)
    data["workspace-secure-server"] = {
        "keycloak-issuer-url": "https://your_server_dns/auth/realms/dtaas"
    }
    assert (
        "workspace-secure-server.keycloak-issuer-url must be a valid URL"
        in collect_errors(data)
    )


_LOGGER_ERROR = "frontend.logger-url must be a valid URL, or empty to turn it off"


@pytest.mark.parametrize("deploy_type", [None, "secure-server"])
@pytest.mark.parametrize(
    "logger_url,errors",
    [
        ("https://logs.example.com/logger", []),
        ("", []),
        ("logs.example.com/logger", [_LOGGER_ERROR]),
        (False, [_LOGGER_ERROR]),
    ],
    ids=["url", "empty", "no-scheme", "boolean"],
)
def test_frontend_logger_url_validated(base, deploy_type, logger_url, errors):
    """logger-url must be a URL or empty, in a standalone and in a scoped
    ('update --config') validation alike."""
    data = copy.deepcopy(base)
    data["frontend"] = {"logger-url": logger_url}
    assert collect_errors(data, deploy_type) == errors
