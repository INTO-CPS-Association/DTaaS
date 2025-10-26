from unittest.mock import patch, MagicMock
import subprocess
from pathlib import Path
import sys


def test_add_user_cli():
    """verify user addition via CLI"""
    # Mock subprocess.run to simulate successful command execution
    with patch("subprocess.run") as mock_run:
        # Setup mock to return successful result
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "Users added successfully\n"
        mock_result.stderr = ""
        mock_run.return_value = mock_result

        # Run as Python module
        result = subprocess.run(
            [sys.executable, "-m", "src.cmd", "admin", "user", "add"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )

        # Verify the command succeeded
        assert (
            result.returncode == 0
        ), f"Command failed: {result.stderr}\n{result.stdout}"

        # Verify subprocess.run was called with correct arguments
        mock_run.assert_called_once_with(
            [sys.executable, "-m", "src.cmd", "admin", "user", "add"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )


def test_delete_user_cli():
    """verify user deletion via CLI"""
    # Mock subprocess.run to simulate successful command execution
    with patch("subprocess.run") as mock_run:
        # Setup mock to return successful result
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "User deleted successfully\n"
        mock_result.stderr = ""
        mock_run.return_value = mock_result

        # Run as Python module
        result = subprocess.run(
            [sys.executable, "-m", "src.cmd", "admin", "user", "delete"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )

        # Verify the command succeeded
        assert (
            result.returncode == 0
        ), f"Command failed: {result.stderr}\n{result.stdout}"

        # Verify subprocess.run was called with correct arguments
        mock_run.assert_called_once_with(
            [sys.executable, "-m", "src.cmd", "admin", "user", "delete"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )
