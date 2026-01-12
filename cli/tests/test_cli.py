"""Integration tests for DTaaS CLI commands."""

import subprocess
from pathlib import Path
import sys


def test_add_user_cli():
    """verify user addition via CLI"""
    # Run as Python module
    result = subprocess.run(
        [sys.executable, "-m", "src.cmd", "admin", "user", "add"],
        capture_output=True,
        text=True,
        cwd=Path(__file__).parent.parent,
        check=False,
    )
    assert result.returncode == 0, f"Command failed: {result.stderr}\n{result.stdout}"


def test_delete_user_cli():
    """verify user deletion via CLI"""
    result = subprocess.run(
        [sys.executable, "-m", "src.cmd", "admin", "user", "delete"],
        capture_output=True,
        text=True,
        cwd=Path(__file__).parent.parent,
        check=False,
    )
    assert result.returncode == 0, f"Command failed: {result.stderr}\n{result.stdout}"
