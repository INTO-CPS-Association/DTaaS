"""Tests for GitLab API client factory (_api.py)."""

import gitlab
import pytest
import dtaas_services.pkg.services.gitlab._api as api

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_HOSTNAME = "services.intocps.org"
TEST_PORT = "8090"


def test_build_base_url_missing_port(monkeypatch):
    """Test RuntimeError when GITLAB_PORT is not set."""
    monkeypatch.delenv("GITLAB_PORT", raising=False)
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    with pytest.raises(RuntimeError, match="GITLAB_PORT"):
        api.build_base_url()


def test_build_base_url_missing_hostname(monkeypatch):
    """Test RuntimeError when HOSTNAME is not set."""
    monkeypatch.setenv("GITLAB_PORT", TEST_PORT)
    monkeypatch.delenv("HOSTNAME", raising=False)
    with pytest.raises(RuntimeError, match="HOSTNAME"):
        api.build_base_url()


def test_build_base_url_success(monkeypatch):
    """Test base URL is built correctly from environment."""
    monkeypatch.setenv("GITLAB_PORT", TEST_PORT)
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    url = api.build_base_url()
    assert url == f"https://{TEST_HOSTNAME}:{TEST_PORT}/gitlab"


def test_build_base_url_invalid_port_non_numeric(monkeypatch):
    """Test RuntimeError on non-numeric GITLAB_PORT."""
    monkeypatch.setenv("GITLAB_PORT", "abc")
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    with pytest.raises(RuntimeError, match="numeric"):
        api.build_base_url()


def test_build_base_url_invalid_port_out_of_range(monkeypatch):
    """Test RuntimeError when GITLAB_PORT is outside 1-65535."""
    monkeypatch.setenv("GITLAB_PORT", "99999")
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    with pytest.raises(RuntimeError, match="65535"):
        api.build_base_url()


def test_build_base_url_invalid_port_zero(monkeypatch):
    """Test RuntimeError when GITLAB_PORT is 0 (reserved/invalid)."""
    monkeypatch.setenv("GITLAB_PORT", "0")
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    with pytest.raises(RuntimeError, match="65535"):
        api.build_base_url()


def test_build_base_url_invalid_hostname_with_whitespace(monkeypatch):
    """Test RuntimeError when HOSTNAME contains whitespace."""
    monkeypatch.setenv("GITLAB_PORT", TEST_PORT)
    monkeypatch.setenv("HOSTNAME", "foo bar.com")
    with pytest.raises(RuntimeError, match="whitespace"):
        api.build_base_url()


def test_get_gitlab_client_returns_client(monkeypatch):
    """Test that get_gitlab_client returns a configured gitlab.Gitlab instance."""
    monkeypatch.setenv("GITLAB_PORT", TEST_PORT)
    monkeypatch.setenv("HOSTNAME", TEST_HOSTNAME)
    monkeypatch.setenv("SSL_VERIFY", "false")

    gl = api.get_gitlab_client(TEST_TOKEN)
    assert isinstance(gl, gitlab.Gitlab)
    assert gl.url == f"https://{TEST_HOSTNAME}:{TEST_PORT}/gitlab"
    assert gl.private_token == TEST_TOKEN


def test_get_ssl_verify_default(monkeypatch):
    """Test SSL verification is enabled by default."""
    monkeypatch.delenv("SSL_VERIFY", raising=False)
    assert api.get_ssl_verify() is True


def test_get_ssl_verify_disabled(monkeypatch):
    """Test SSL verification can be disabled."""
    monkeypatch.setenv("SSL_VERIFY", "false")
    assert api.get_ssl_verify() is False
