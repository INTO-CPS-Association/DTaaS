"""Tests for local_server.py."""

import subprocess
from pathlib import Path

import local_server
import stack
from settings import Settings


def test_parse_args_accepts_options_after_command(tmp_path):
    """Options work after the command name."""
    command, settings = local_server.parse_args(
        ["check", "--hostname", "dtaas.test", "--registry-port", "5051",
         "--workdir", str(tmp_path)])
    assert command == "check"
    assert settings.registry == "dtaas.test:5051"
    assert settings.workdir == tmp_path.resolve()


def test_parse_args_defaults():
    """Defaults match the developer guide."""
    _, settings = local_server.parse_args(["up"])
    assert settings.hostname == "intocps.test"
    assert settings.registry_port == 5050
    assert settings.workdir == (Path.home() / "dtaas-local-test").resolve()


def test_main_exit_codes(monkeypatch):
    """main returns 1 for failed checks and command errors."""
    def fail(settings):
        """Fail like a docker command that exits with 1."""
        raise subprocess.CalledProcessError(1, ["docker"])
    for result, code in ((True, 0), (None, 0), (False, 1)):
        monkeypatch.setitem(local_server.COMMANDS, "check",
                            ("", lambda settings, r=result: r))
        assert local_server.main(["check"]) == code
    monkeypatch.setitem(local_server.COMMANDS, "check", ("", fail))
    assert local_server.main(["check"]) == 1


def test_main_reports_missing_program(monkeypatch, capsys):
    """A missing program such as docker gives an error, not a traceback."""
    def missing(settings):
        """Fail like subprocess does when docker is not installed."""
        raise FileNotFoundError(2, "No such file or directory", "docker")
    monkeypatch.setitem(local_server.COMMANDS, "check", ("", missing))
    assert local_server.main(["check"]) == 1
    assert "error:" in capsys.readouterr().err


def test_stop_without_prepared_package(tmp_path, monkeypatch):
    """down and clean do nothing before the package is prepared."""
    calls = []
    monkeypatch.setattr(stack, "run", lambda *args, **kwargs: calls.append(args))
    stack.stop(Settings("intocps.test", 5050, tmp_path))
    assert not calls
