"""Tests for admin user commands in the CLI."""

from unittest.mock import patch
import pytest
from click.testing import CliRunner
from src.cmd import dtaas
# pylint: disable=redefined-outer-name


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


@pytest.fixture
def mock_user_pkg():
    """Mock user package functions"""
    with patch("src.cmd.userPkg.add_users") as mock_add, patch(
        "src.cmd.userPkg.delete_user"
    ) as mock_delete:
        yield {"add": mock_add, "delete": mock_delete}


def test_add_users_success(runner, mock_user_pkg):
    """Test successful user addition"""
    mock_user_pkg["add"].return_value = None

    result = runner.invoke(dtaas, ["admin", "user", "add"])
    assert result.exit_code == 0
    assert "Users added successfully" in result.output
    mock_user_pkg["add"].assert_called_once()


def test_add_users_error(runner, mock_user_pkg):
    """Test user addition with error"""
    mock_user_pkg["add"].return_value = Exception("Add failed")

    result = runner.invoke(dtaas, ["admin", "user", "add"])
    assert result.exit_code != 0
    assert "Error while adding users" in result.output


def test_delete_user_success(runner, mock_user_pkg):
    """Test successful user deletion"""
    mock_user_pkg["delete"].return_value = None

    result = runner.invoke(dtaas, ["admin", "user", "delete"])
    assert result.exit_code == 0
    assert "User deleted successfully" in result.output
    mock_user_pkg["delete"].assert_called_once()


def test_delete_user_error(runner, mock_user_pkg):
    """Test user deletion with error"""
    mock_user_pkg["delete"].return_value = Exception("Delete failed")

    result = runner.invoke(dtaas, ["admin", "user", "delete"])
    assert result.exit_code != 0
    assert "Error while deleting users" in result.output
