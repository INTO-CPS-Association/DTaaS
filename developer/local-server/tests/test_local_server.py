"""Tests for local_server.py."""

import subprocess
from pathlib import Path

import local_server


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
