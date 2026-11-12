"""Tests for the main CLI entry point (cmd.py)"""

import pytest
from dtaas_services.cmd import services
from dtaas_services.pkg.utils import permission_hint
from tests.conftest import denied
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
    "old_name",
    [
        "generate-project",
        "setup",
        "install",
        "start",
        "stop",
        "restart",
        "status",
        "remove",
        "clean",
    ],
)
def test_removed_top_level_spellings_are_rejected(runner, old_name):
    """The 0.x top level spellings removed in 2.0.0 are unknown commands"""
    result = runner.invoke(services, [old_name])
    assert result.exit_code == 2
    assert f"No such command '{old_name}'" in result.output


PASSWORDS = "/srv/config/password.env.current"


@pytest.mark.parametrize(
    "exc,shown",
    [
        (PermissionError(permission_hint(PASSWORDS)), permission_hint(PASSWORDS)),
        (denied(PASSWORDS), f"[Errno 13] Permission denied: '{PASSWORDS}'"),
    ],
    ids=["config-file-with-its-fix", "any-other-file"],
)
def test_a_permission_error_ends_with_its_own_message(runner, mocker, exc, shown):
    """A file no command could open ends the command with exit code 1 and
    the error's own message, never a traceback. Only the files this CLI
    keeps under config/ carry a chown: no other file, such as one 'host
    setup' gave to a service's user, gets that advice."""
    mocker.patch(
        "dtaas_services.commands.user_ops.parse_service_list", side_effect=exc
    )
    result = runner.invoke(services, ["user", "add"])
    assert result.exit_code == 1
    assert f"Error: {shown}" in result.output
    assert result.output.count("chown") == shown.count("chown")
