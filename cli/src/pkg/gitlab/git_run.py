"""Runs git on this host: whether it is usable, and one command at a time.

Every git command of the project step goes through run_git, so each one is
stopped after GIT_TIMEOUT_SECONDS: a slow or stalled host, or a template
too large to finish, cannot hang 'user add'.
"""

import re
import subprocess

MIN_GIT_VERSION = (2, 31)
GIT_TIMEOUT_SECONDS = 15 * 60


def run_git(args, env=None):
    """Run git with *args*, capturing its output as text. A command still
    running after GIT_TIMEOUT_SECONDS is stopped and reported as failed."""
    try:
        return subprocess.run(
            ["git", *args],
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=GIT_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        minutes = GIT_TIMEOUT_SECONDS // 60
        return subprocess.CompletedProcess(
            args, -1, "", f"git did not finish within {minutes} minutes."
        )


def git_problem():
    """Why git cannot be used here, or "" when it is installed and new enough.

    Checked once per run, before any project is touched.
    """
    try:
        version = run_git(["--version"]).stdout.strip()
    except OSError:
        return "git is not installed, or not on PATH."
    match = re.match(r"git version (\d+)\.(\d+)", version)
    if match and tuple(int(part) for part in match.groups()) >= MIN_GIT_VERSION:
        return ""
    return f"'{version}' is too old: git 2.31 or later is needed."
