"""Integration tests for DTaaS CLI commands."""

import subprocess
from pathlib import Path
import sys


def _run(*args):
    """Invoke the CLI as a module and return the completed process."""
    return subprocess.run(
        [sys.executable, "-m", "src.cmd", *args],
        capture_output=True,
        text=True,
        cwd=Path(__file__).parent.parent,
        check=False,
    )


def test_cli_help_lists_nouns_in_workflow_order():
    """dtaas --help lists the nouns in config -> deployment -> platform -> user order."""
    result = _run("--help")
    assert result.returncode == 0
    out = result.stdout
    positions = [
        out.index(noun) for noun in ("config", "deployment", "platform", "user")
    ]
    assert positions == sorted(positions)


def test_user_add_runs_and_fails_without_config():
    """'user add' actually executes the CLI (module entrypoint) and errors out.

    Guards against the old no-op where 'python -m src.cmd ...' imported the
    module without running it; here it must reach config loading and fail.
    """
    result = _run("user", "add")
    assert result.returncode != 0
    assert "Error" in result.stderr


def test_user_delete_requires_target():
    """A bare 'user delete' with no USERNAMES or --file is rejected."""
    result = _run("user", "delete")
    assert result.returncode != 0
    assert "Provide one or more USERNAMES" in result.stderr
