"""Tests for the main CLI entry point (cmd.py) and deprecated aliases"""

import pytest
from dtaas_services.cmd import services
from dtaas_services.commands import service_ops
from dtaas_services.commands.aliases import DEPRECATED_ALIASES
# pylint: disable=W0621


def _listed_commands(help_output: str) -> list[str]:
    """Return command names from the Commands section of a help page."""
    section = help_output.split("Commands:")[1]
    return [
        line.split()[0]
        for line in section.splitlines()
        if line.startswith("  ") and not line.startswith("   ")
    ]


def test_services_help_lists_nouns_in_workflow_order(runner):
    """Root help shows only the four nouns, in workflow order"""
    result = runner.invoke(services, ["--help"])
    assert result.exit_code == 0
    assert "Manage DTaaS platform services" in result.output
    assert _listed_commands(result.output) == ["project", "host", "service", "user"]


@pytest.mark.parametrize(
    "noun, verbs",
    [
        ("project", ["generate"]),
        ("host", ["setup"]),
        ("service", ["clean", "install", "remove", "restart", "start", "status", "stop"]),
        ("user", ["add", "reset-password"]),
    ],
)
def test_noun_help_lists_verbs(runner, noun, verbs):
    """Each noun without a verb prints its own help"""
    result = runner.invoke(services, [noun])
    assert sorted(_listed_commands(result.output)) == verbs


@pytest.mark.parametrize(
    "old_name, new_name, target",
    DEPRECATED_ALIASES,
    ids=[alias[0] for alias in DEPRECATED_ALIASES],
)
def test_deprecated_alias_forwards(runner, mocker, old_name, new_name, target):
    """Old spellings forward to the new command and warn on stderr"""
    callback = mocker.patch.object(target, "callback")
    result = runner.invoke(services, [old_name])
    assert result.exit_code == 0
    callback.assert_called_once()
    assert f"'dtaas-services {old_name}' is deprecated" in result.stderr
    assert f"use 'dtaas-services {new_name}'" in result.stderr


@pytest.mark.parametrize(
    "args, target, expected_kwargs",
    [
        (["install", "-s", "gitlab"], service_ops.install,
         {"service_names": "gitlab", "legacy_service": None}),
        (["install", "--service", "gitlab"], service_ops.install,
         {"service_names": None, "legacy_service": "gitlab"}),
        (["remove", "-v"], service_ops.remove, {"service_names": None, "volumes": True}),
    ],
)
def test_deprecated_alias_keeps_old_flags(runner, mocker, args, target, expected_kwargs):
    """Old flags still reach the new command through the alias"""
    callback = mocker.patch.object(target, "callback")
    result = runner.invoke(services, args)
    assert result.exit_code == 0
    callback.assert_called_once_with(**expected_kwargs)
