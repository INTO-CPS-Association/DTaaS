"""Tests for git_run.py: is git installed here and new enough, and every git
command bounded in time."""

import subprocess
from unittest.mock import patch

import pytest
from src.pkg.gitlab import git_run


@pytest.mark.parametrize(
    "version,usable",
    [
        ("git version 2.46.2.windows.1", True),
        ("git version 2.31.0", True),
        ("git version 2.39.3 (Apple Git-145)", True),
        ("git version 2.25.1", False),
        ("", False),
        ("2" * 20000, False),
    ],
    ids=["new", "minimum", "apple", "old", "unreadable", "not git"],
)
def test_git_problem_checks_the_version(version, usable):
    """git 2.31 is the first to read settings from GIT_CONFIG_COUNT."""
    found = subprocess.CompletedProcess([], 0, version + "\n", "")
    with patch("src.pkg.gitlab.git_run.run_git", return_value=found):
        problem = git_run.git_problem()
    assert (problem == "") is usable
    assert usable or "git 2.31 or later is needed" in problem


def test_git_problem_without_git():
    """A host without git is told so, in one line."""
    with patch("src.pkg.gitlab.git_run.run_git", side_effect=FileNotFoundError("git")):
        assert git_run.git_problem() == "git is not installed, or not on PATH."


def test_this_hosts_git_is_usable():
    """The git these tests run is new enough, so the copy tests are real."""
    assert git_run.git_problem() == ""


def test_a_git_command_that_hangs_is_stopped():
    """Every git command runs with a timeout; one that reaches it fails
    with a message instead of hanging 'user add'."""
    timeout = git_run.GIT_TIMEOUT_SECONDS
    expired = subprocess.TimeoutExpired(["git", "clone"], timeout)
    with patch("src.pkg.gitlab.git_run.subprocess.run", side_effect=expired) as run:
        done = git_run.run_git(["clone"])
    assert (done.returncode, done.stderr) == (
        -1,
        "git did not finish within 15 minutes.",
    )
    assert run.call_args.kwargs["timeout"] == timeout
