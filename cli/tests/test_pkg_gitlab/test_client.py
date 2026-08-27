"""Tests for GitLab client resolution (pkg/gitlab/client.py)."""

from unittest.mock import MagicMock
from src.pkg.gitlab.client import PAT_ENV_VAR, resolve_client, resolve_pat

API_URL = "https://gitlab.example.com"
PAT = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR


def _config(api_url=API_URL, pat="", ssl_verify=True, pat_err=None, url_err=None):
    """A Config-shaped mock returning the given [gitlab] values."""
    cfg = MagicMock()
    cfg.get_gitlab_api_url.return_value = (api_url, url_err)
    cfg.get_gitlab_pat.return_value = (pat, pat_err)
    cfg.get_gitlab_ssl_verify.return_value = (ssl_verify, None)
    return cfg


def test_resolve_pat_prefers_config_value(monkeypatch):
    """A [gitlab].pat value is used without consulting the environment."""
    monkeypatch.delenv(PAT_ENV_VAR, raising=False)
    pat, err = resolve_pat(_config(pat=PAT))
    assert err is None
    assert pat == PAT


def test_resolve_pat_falls_back_to_env_var(monkeypatch):
    """An empty [gitlab].pat falls back to DTAAS_GITLAB_PAT."""
    monkeypatch.setenv(PAT_ENV_VAR, PAT)
    pat, err = resolve_pat(_config(pat=""))
    assert err is None
    assert pat == PAT


def test_resolve_pat_missing_everywhere_errors(monkeypatch):
    """Neither config nor environment supplying a PAT is a clear error."""
    monkeypatch.delenv(PAT_ENV_VAR, raising=False)
    pat, err = resolve_pat(_config(pat=""))
    assert pat is None
    assert err is not None
    assert PAT_ENV_VAR in str(err)


def test_resolve_pat_propagates_config_error():
    """A malformed [gitlab] section's error is surfaced, not masked."""
    pat, err = resolve_pat(_config(pat_err=Exception("bad config")))
    assert pat is None
    assert err is not None


def test_resolve_client_builds_authenticated_client(monkeypatch):
    """resolve_client wires api_url/pat/ssl_verify into gitlab_common's factory."""
    monkeypatch.delenv(PAT_ENV_VAR, raising=False)
    gl, err = resolve_client(_config(api_url=API_URL, pat=PAT, ssl_verify=False))
    assert err is None
    assert gl.url == API_URL
    assert gl.private_token == PAT
    assert gl.ssl_verify is False


def test_resolve_client_propagates_missing_api_url():
    """A missing api_url is reported rather than silently defaulted."""
    gl, err = resolve_client(_config(url_err=Exception("no api_url")))
    assert gl is None
    assert err is not None


def test_resolve_client_propagates_pat_resolution_failure(monkeypatch):
    """A PAT that cannot be resolved prevents client construction."""
    monkeypatch.delenv(PAT_ENV_VAR, raising=False)
    gl, err = resolve_client(_config(pat=""))
    assert gl is None
    assert err is not None


def test_resolve_client_warns_when_ssl_verify_disabled(monkeypatch, capsys):
    """Disabling TLS verification is not silent: it warns, since it means
    the admin PAT and provisioned users' passwords travel unverified."""
    monkeypatch.delenv(PAT_ENV_VAR, raising=False)
    gl, err = resolve_client(_config(api_url=API_URL, pat=PAT, ssl_verify=False))
    assert err is None
    assert gl.ssl_verify is False
    assert "ssl_verify is disabled" in capsys.readouterr().err


def test_resolve_client_does_not_warn_for_a_ca_bundle_path(monkeypatch, capsys):
    """A CA bundle path is a deliberate, verified configuration -- no warning."""
    monkeypatch.delenv(PAT_ENV_VAR, raising=False)
    gl, err = resolve_client(
        _config(api_url=API_URL, pat=PAT, ssl_verify="/etc/ssl/certs/corp-ca.pem")
    )
    assert err is None
    assert gl.ssl_verify == "/etc/ssl/certs/corp-ca.pem"
    assert capsys.readouterr().err == ""
