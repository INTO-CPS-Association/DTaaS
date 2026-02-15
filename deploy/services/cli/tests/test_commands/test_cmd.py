"""Tests for the main CLI entry point (cmd.py)"""

# pylint: disable=redefined-outer-name
from click.testing import CliRunner
import pytest
from dtaas_services.cmd import services


@pytest.fixture
def runner():
    """CLI test runner"""
    return CliRunner()


def test_services_help(runner):
    """Test services command shows help"""
    result = runner.invoke(services, ["--help"])
    assert result.exit_code == 0
    assert "Manage DTaaS platform services" in result.output
