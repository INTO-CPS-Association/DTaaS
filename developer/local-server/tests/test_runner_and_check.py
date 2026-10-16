"""Tests for runner.py and registry_check.py."""

import base64
import subprocess
import urllib.error

import pytest

from fakes import FakeGitLab

import registry_check
import runner
import shell
from settings import Settings


def test_runner_config_uses_frontend_network():
    """Runner jobs join dtaas-frontend without privileges."""
    config = runner.runner_config("https://h/gitlab", "glrt-1")
    assert 'url = "https://h/gitlab/"' in config
    assert 'token = "glrt-1"' in config
    assert 'network_mode = "dtaas-frontend"' in config
    assert "privileged = false" in config
    assert 'tls-ca-file = "/etc/gitlab-runner/certs/ca.crt"' in config


def test_start_runner_writes_project(tmp_path, monkeypatch):
    """Starting a runner writes its compose project and CA copy."""
    settings = Settings("intocps.test", 5050, tmp_path)
    settings.ca_file.write_text("CA", encoding="utf-8")
    monkeypatch.setattr(runner, "run", lambda args, cwd=None: None)
    gitlab = FakeGitLab({("POST", "user/runners"): {"token": "glrt-2"}})
    runner.start_runner(settings, gitlab)
    assert "glrt-2" in (settings.runner_dir / "config.toml").read_text(encoding="utf-8")
    assert (settings.runner_dir / "ca.crt").read_text(encoding="utf-8") == "CA"
    assert "./ca.crt:" in (settings.runner_dir / "compose.yml").read_text(encoding="utf-8")


def test_commit_pipeline_creates_updates_or_skips():
    """The file is created, updated when it differs, and left when equal."""
    path = "projects/4/repository/files/.gitlab-ci.yml?ref=main"
    content = registry_check.PIPELINE_FILE.read_text(encoding="utf-8")
    same = base64.b64encode(content.encode()).decode()
    other = base64.b64encode(b"old").decode()
    for existing, actions in (({}, ["create"]),
                              ({path: {"content": other}}, ["update"]),
                              ({path: {"content": same}}, [])):
        gitlab = FakeGitLab(existing=existing)
        registry_check.commit_pipeline(gitlab, 4)
        assert [data["actions"][0]["action"] for _, _, data in gitlab.requests] == actions
        for _, _, data in gitlab.requests:
            assert "[skip ci]" in data["commit_message"]


def fake_docker(commands, pull_fails):
    """Return a run() double that records docker subcommands."""
    def fake_run(args, **_):
        """Record the subcommand; fail the pull if asked."""
        commands.append(args[1])
        if pull_fails and args[1] == "pull":
            raise subprocess.CalledProcessError(1, args)
    return fake_run


def test_outsider_is_denied_when_pull_fails(tmp_path, monkeypatch):
    """The access check passes only when the outsider's pull fails."""
    settings = Settings("intocps.test", 5050, tmp_path)
    gitlab = FakeGitLab({("POST", "users/7/impersonation_tokens"): {"token": "t"}})
    gitlab.find_user = lambda username: {"id": 7}
    for pull_fails, expected in ((True, True), (False, False)):
        commands = []
        monkeypatch.setattr(registry_check, "run",
                            fake_docker(commands, pull_fails))
        assert registry_check.outsider_is_denied(settings, gitlab, "img") is expected
        assert commands == ["rmi", "login", "pull", "logout"]


def test_check_token_explains_expired_token():
    """A 401 from GitLab points to the configure command."""
    class Expired(FakeGitLab):
        """Answers every request with 401."""

        def request(self, method, path, data=None):
            raise urllib.error.HTTPError("url", 401, "msg", {}, None)
    with pytest.raises(RuntimeError, match="configure"):
        registry_check.check_token(Expired())


def test_run_pipeline_passes_only_if_all_jobs_succeed(monkeypatch):
    """The check passes only when every job succeeds."""
    monkeypatch.setattr(shell.time, "sleep", lambda seconds: None)
    jobs = [{"id": 2, "name": "reuse", "status": "success"},
            {"id": 1, "name": "publish", "status": "success"}]
    gitlab = FakeGitLab({
        ("POST", "projects/4/pipeline"): {"id": 9},
        ("GET", "projects/4/pipelines/9"): {"status": "success"},
        ("GET", "projects/4/pipelines/9/jobs"): jobs,
    })
    assert registry_check.run_pipeline(gitlab, 4)
    jobs[0]["status"] = "failed"
    assert not registry_check.run_pipeline(gitlab, 4)


def test_check_registry_fails_when_outsider_can_pull(tmp_path, monkeypatch):
    """The check fails if access control lets the outsider pull."""
    settings = Settings("intocps.test", 5050, tmp_path)
    monkeypatch.setattr(registry_check, "read_secret", lambda s, name: "tok")
    gitlab = FakeGitLab()
    gitlab.ensure_group = lambda name: {"id": 1, "path": name}
    gitlab.ensure_project = lambda group, name: {
        "id": 4, "path_with_namespace": f"{group['path']}/{name}"}
    monkeypatch.setattr(registry_check, "GitLab", lambda *args: gitlab)
    for name in ("push_and_pull", "start_runner"):
        monkeypatch.setattr(registry_check, name, lambda *args: None)
    monkeypatch.setattr(registry_check, "run_pipeline", lambda *args: True)
    for denied, expected in ((True, True), (False, False)):
        monkeypatch.setattr(registry_check, "outsider_is_denied",
                            lambda *args, d=denied: d)
        assert registry_check.check_registry(settings) is expected
