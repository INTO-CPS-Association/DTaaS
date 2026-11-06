"""Tests for user add-signals"""

import stat
import pytest
from dtaas_services.cmd import services
from dtaas_services.pkg.services import rabbitmq_accounts
# pylint: disable=W0621



@pytest.fixture
def ctl(mocker):
    """Mock rabbitmqctl, with no users in the broker"""
    return mocker.patch.object(
        rabbitmq_accounts, "rabbitmqctl", return_value=(True, "guest\t[]\n")
    )


def test_add_signals_creates_the_account_and_its_secret(runner, base_dir, ctl):
    """The account is made with a password file of mode 600"""
    result = runner.invoke(services, ["user", "add-signals", "-p", "SWiM"])
    assert result.exit_code == 0, result.output
    path = base_dir / "secrets" / "signals" / "rabbitmq_dtaas_signals_password"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    password = path.read_text(encoding="utf-8").strip()
    assert password not in result.output
    commands = [call.args[0][0] for call in ctl.call_args_list]
    assert commands == ["list_users", "add_user", "set_permissions"] + [
        "set_topic_permissions"
    ]
    assert ctl.call_args_list[1].kwargs["stdin"] == password + "\n"


def test_add_signals_grants_read_on_projects_and_write_on_cmd(runner, base_dir, ctl):
    """Topic read covers the projects, topic write only their cmd topics"""
    result = runner.invoke(
        services, ["user", "add-signals", "-p", "SWiM", "-p", "Soil"]
    )
    assert result.exit_code == 0, result.output
    topic_args = ctl.call_args_list[-1].args[0]
    assert topic_args[-2] == r"^(SWiM|Soil)(\.[^.]+){6}\.cmd\.[^.]+$"
    assert topic_args[-1] == r"^(SWiM|Soil)\."
    assert base_dir.exists()


def test_add_signals_needs_a_project(runner, base_dir, ctl):
    """Without a project the command stops before touching the broker"""
    result = runner.invoke(services, ["user", "add-signals"])
    assert result.exit_code != 0
    assert "--project" in result.output
    ctl.assert_not_called()
    assert base_dir.exists()


def test_add_signals_refuses_an_unsafe_project(runner, base_dir, ctl):
    """A project with '.' or a wildcard is refused"""
    result = runner.invoke(services, ["user", "add-signals", "-p", "SWiM.#"])
    assert result.exit_code != 0
    assert "Invalid project name" in result.output
    ctl.assert_not_called()
    assert not (base_dir / "secrets").exists()


def test_add_signals_reports_a_broker_failure(runner, base_dir, ctl):
    """A rabbitmqctl failure ends the command with its message"""
    ctl.return_value = (False, "rabbitmqctl list_users failed: no container")
    result = runner.invoke(services, ["user", "add-signals", "-p", "SWiM"])
    assert result.exit_code != 0
    assert "no container" in result.output
    assert base_dir.exists()
