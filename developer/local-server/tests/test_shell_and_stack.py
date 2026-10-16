"""Tests for shell.py and stack.py."""

import subprocess

import pytest

import shell
import stack
from settings import Settings


def test_run_returns_output_and_raises_on_failure():
    """run returns stripped output when captured and raises on failure."""
    assert shell.run(["echo", " hi "], capture=True) == "hi"
    assert shell.run(["true"]) == ""
    with pytest.raises(subprocess.CalledProcessError):
        shell.run(["false"])


def test_sudo_prefixes_command(monkeypatch):
    """sudo runs the command through sudo."""
    calls = []
    monkeypatch.setattr(shell, "run", lambda args, input_text=None: calls.append(args))
    shell.sudo(["tee", "/etc/hosts"])
    assert calls == [["sudo", "tee", "/etc/hosts"]]


def test_wait_until_returns_value_or_times_out(monkeypatch):
    """wait_until returns the first true value and times out otherwise."""
    monkeypatch.setattr(shell.time, "sleep", lambda seconds: None)
    answers = iter([None, "", "ready"])
    assert shell.wait_until(lambda: next(answers), 60, 1, "test") == "ready"
    with pytest.raises(TimeoutError, match="never"):
        shell.wait_until(lambda: False, 0.01, 0, "never")


def test_start_runs_compose_and_waits(tmp_path, monkeypatch):
    """start runs compose with the override and waits for both URLs."""
    settings = Settings("intocps.test", 5051, tmp_path)
    calls, checks = [], []
    monkeypatch.setattr(stack, "run", lambda args, cwd=None: calls.append((args, cwd)))
    monkeypatch.setattr(stack, "wait_for", lambda pairs, ca: checks.extend(pairs))
    stack.start(settings)
    args, cwd = calls[0]
    assert args[-2:] == ["up", "-d"] and "compose.local.yml" in args
    assert cwd == settings.package_dir
    assert checks == [("https://intocps.test/gitlab/users/sign_in", 200),
                      ("https://intocps.test:5051/v2/", 401)]
