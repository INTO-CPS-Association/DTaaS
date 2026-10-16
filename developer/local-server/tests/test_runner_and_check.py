"""Tests for runner.py and registry_check.py."""

from fakes import FakeGitLab

import registry_check
import runner
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


def test_commit_pipeline_creates_or_updates():
    """The pipeline file is created first and updated afterwards."""
    path = "projects/4/repository/files/.gitlab-ci.yml?ref=main"
    for existing, action in (({}, "create"), ({path: {"x": 1}}, "update")):
        gitlab = FakeGitLab(existing=existing)
        registry_check.commit_pipeline(gitlab, 4)
        assert gitlab.requests[0][2]["actions"][0]["action"] == action


def test_run_pipeline_passes_only_if_all_jobs_succeed(monkeypatch):
    """The check passes only when every job succeeds."""
    monkeypatch.setattr(registry_check.time, "sleep", lambda seconds: None)
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
