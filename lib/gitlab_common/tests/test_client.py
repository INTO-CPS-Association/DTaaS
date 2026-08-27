"""Tests for the shared GitLab client factory (gitlab_common/client.py)."""

import warnings

import gitlab
from gitlab_common import get_gitlab_client

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


def test_ssl_verify_accepts_ca_bundle_path():
    """A CA bundle path is passed through, keeping verification enabled."""
    ca_bundle = "/etc/ssl/certs/dtaas-ca.pem"
    gl = get_gitlab_client(TEST_URL, TEST_TOKEN, ssl_verify=ca_bundle)
    assert gl.ssl_verify == ca_bundle


def test_does_not_mutate_global_warning_filters():
    """The shared factory must not silence warnings process-wide.

    Suppressing InsecureRequestWarning is the application's decision (see
    pkg.services.gitlab._api); a library that did it on import would silence
    it for every unrelated urllib3 consumer in the same process.
    """
    before = list(warnings.filters)
    get_gitlab_client(TEST_URL, TEST_TOKEN, ssl_verify=False)
    assert warnings.filters == before
