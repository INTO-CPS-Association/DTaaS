"""Tests for gitlab.py."""

import io
import json
import urllib.error

import pytest

import gitlab


class FakeResponse(io.BytesIO):
    """HTTP response that also works as a context manager."""

    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def http_error(code):
    """Return an HTTPError with the given status code."""
    return urllib.error.HTTPError("url", code, "msg", {}, None)


@pytest.fixture(name="client")
def fixture_client(tmp_path, monkeypatch):
    """Return a GitLab client that skips TLS setup."""
    monkeypatch.setattr(gitlab.ssl, "create_default_context", lambda cafile: None)
    return gitlab.GitLab("https://h/gitlab", "token", tmp_path / "ca.pem")


def test_http_status_reports_http_errors_and_no_answer(monkeypatch):
    """HTTP errors give their status; no answer gives 0."""
    monkeypatch.setattr(gitlab.ssl, "create_default_context", lambda cafile: None)

    def raise_401(*args, **kwargs):
        """Answer every request with 401."""
        raise http_error(401)
    monkeypatch.setattr(gitlab.urllib.request, "urlopen", raise_401)
    assert gitlab.http_status("https://h/v2/", "ca") == 401

    def refuse(*args, **kwargs):
        """Fail as if nothing listens."""
        raise urllib.error.URLError("refused")
    monkeypatch.setattr(gitlab.urllib.request, "urlopen", refuse)
    assert gitlab.http_status("https://h/v2/", "ca") == 0


def test_wait_for_times_out(monkeypatch):
    """wait_for raises TimeoutError when the status never matches."""
    monkeypatch.setattr(gitlab, "http_status", lambda url, ca: 502)
    with pytest.raises(TimeoutError):
        gitlab.wait_for([("https://h", 200)], "ca", timeout=0.05, interval=0.01)


def test_request_sends_token_and_json(client, monkeypatch):
    """Requests carry the token and a JSON body."""
    sent = {}

    def urlopen(request, **_):
        """Record the request and answer with JSON."""
        sent["request"] = request
        return FakeResponse(b'{"id": 7}')
    monkeypatch.setattr(gitlab.urllib.request, "urlopen", urlopen)
    assert client.request("POST", "groups", {"name": "g"}) == {"id": 7}
    request = sent["request"]
    assert request.full_url == "https://h/gitlab/api/v4/groups"
    assert request.get_header("Private-token") == "token"
    assert json.loads(request.data) == {"name": "g"}


def test_find_returns_none_on_404(client, monkeypatch):
    """find turns a 404 into None."""
    def raise_404(*args, **kwargs):
        """Answer every request with 404."""
        raise http_error(404)
    monkeypatch.setattr(gitlab.urllib.request, "urlopen", raise_404)
    assert client.find("groups/missing") is None


def test_ensure_project_creates_missing_project(client, monkeypatch):
    """A missing project is created in the group's namespace."""
    calls = []
    monkeypatch.setattr(client, "find", calls.append)
    monkeypatch.setattr(client, "request", lambda method, path, data=None:
                        calls.append((method, path, data)) or {"id": 3})
    project = client.ensure_project({"path": "dtaas", "id": 2}, "registry-test")
    assert project == {"id": 3}
    assert calls[0] == "projects/dtaas%2Fregistry-test"
    assert calls[1][2]["namespace_id"] == 2


def test_ensure_user_skips_existing_user(client, monkeypatch):
    """An existing username is not created again."""
    monkeypatch.setattr(client, "request", lambda method, path, data=None:
                        [{"id": 1}] if method == "GET" else None)
    assert client.ensure_user("user1", "u@e.com", "pw") is False


def test_create_root_token_takes_last_line(monkeypatch):
    """The token is the last line of the Rails runner output."""
    monkeypatch.setattr(gitlab, "run", lambda args, capture=False:
                        "warning\nglpat-abc")
    assert gitlab.create_root_token() == "glpat-abc"


def test_create_root_token_rejects_empty_output(monkeypatch):
    """No output means GitLab created no token."""
    monkeypatch.setattr(gitlab, "run", lambda args, capture=False: "")
    with pytest.raises(RuntimeError, match="no access token"):
        gitlab.create_root_token()
