"""Tests for the GitLab client factory (client.py)."""

import gitlab
from dtaas_gitlab import get_gitlab_client

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_URL = "https://services.intocps.org:8090/gitlab"


def test_returns_configured_client():
    """get_gitlab_client returns a gitlab.Gitlab wired to the given url/token."""
    gl = get_gitlab_client(TEST_URL, TEST_TOKEN, ssl_verify=False)
    assert isinstance(gl, gitlab.Gitlab)
    assert gl.url == TEST_URL
    assert gl.private_token == TEST_TOKEN


def test_ssl_verify_defaults_to_true():
    """SSL verification is enabled unless explicitly disabled."""
    gl = get_gitlab_client(TEST_URL, TEST_TOKEN)
    assert gl.ssl_verify is True


def test_ssl_verify_can_be_disabled():
    """ssl_verify=False is propagated to the client."""
    gl = get_gitlab_client(TEST_URL, TEST_TOKEN, ssl_verify=False)
    assert gl.ssl_verify is False
