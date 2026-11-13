"""Tests for RabbitMQ program accounts in vhost '/'"""

import re
import subprocess
from unittest.mock import Mock
import pytest
from dtaas_services.pkg.services import rabbitmq_accounts as accounts
# pylint: disable=W0621


def _result(returncode=0, stdout="", stderr=""):
    return Mock(returncode=returncode, stdout=stdout, stderr=stderr)


@pytest.fixture
def run(mocker):
    """Mock subprocess.run in the accounts module"""
    return mocker.patch.object(accounts.subprocess, "run", return_value=_result())


@pytest.mark.parametrize("project", ["SWiM", "soil-site_2", "A"])
def test_validate_projects_accepts_topic_levels(project):
    """Letters, digits, '-' and '_' are valid first topic levels"""
    assert accounts.validate_projects([project]) == (True, "")


@pytest.mark.parametrize("project", ["", "a.b", "a/b", "#", "+", "$SYS", ".*", "a b"])
def test_validate_projects_refuses_unsafe_levels(project):
    """Characters that change a topic or a regular expression are refused"""
    valid, message = accounts.validate_projects([project])
    assert not valid
    assert "Invalid project" in message


def test_validate_projects_needs_one_project():
    """An empty list is refused"""
    assert accounts.validate_projects([])[0] is False


def test_read_pattern_matches_only_the_projects():
    """Reads cover every topic of a served project and nothing else"""
    pattern = re.compile(accounts.project_read_pattern(["SWiM", "Soil"]))
    assert pattern.search("SWiM.CTO.room.0224.seat48A.S.dev1.temperature")
    assert pattern.search("Soil.#")
    assert not pattern.search("SWiMX.CTO.room")
    assert not pattern.search("Other.SWiM.room")


def test_write_pattern_matches_only_command_topics():
    """Writes cover .../cmd/<command> of a served project and nothing else"""
    pattern = re.compile(accounts.command_write_pattern(["SWiM"]))
    assert pattern.search("SWiM.CTO.room.0224.seat48A.A.dev1.cmd.set")
    assert not pattern.search("SWiM.CTO.room.0224.seat48A.A.dev1.temperature")
    assert not pattern.search("SWiM.CTO.room.0224.seat48A.A.dev1.cmd.set.more")
    assert not pattern.search("Other.CTO.room.0224.seat48A.A.dev1.cmd.set")
    assert not pattern.search("SWiM.CTO.room.0224.A.dev1.cmd.set")


def test_rabbitmqctl_passes_stdin_and_never_the_password_as_argument(run):
    """The password reaches rabbitmqctl through stdin only"""
    accounts.rabbitmqctl(["add_user", "dtaas_signals"], stdin="secret\n")
    args, kwargs = run.call_args
    assert "secret" not in " ".join(args[0])
    assert kwargs["input"] == "secret\n"
    assert args[0][:4] == ["docker", "exec", "-i", "rabbitmq"]


def test_rabbitmqctl_reports_the_last_error_line(run):
    """A failure returns the last line of stderr"""
    run.return_value = _result(70, stderr="Error:\nUser already exists\n")
    assert accounts.rabbitmqctl(["add_user", "x"]) == (
        False,
        "rabbitmqctl add_user failed: User already exists",
    )


def test_rabbitmqctl_reports_a_timeout(run):
    """A hanging container is reported, not raised"""
    run.side_effect = subprocess.TimeoutExpired("docker", 60)
    success, message = accounts.rabbitmqctl(["list_users"])
    assert not success
    assert "TimeoutExpired" in message


def test_ensure_user_adds_a_missing_user(run):
    """A new user is added with add_user"""
    run.side_effect = [_result(stdout="guest\t[administrator]\n"), _result()]
    assert accounts.ensure_user("dtaas_signals", "pw") == (True, "")
    assert run.call_args_list[1].args[0][-2:] == ["add_user", "dtaas_signals"]


def test_ensure_user_changes_the_password_of_an_existing_user(run):
    """An existing user gets the password of its secret file"""
    run.side_effect = [_result(stdout="dtaas_signals\t[]\n"), _result()]
    assert accounts.ensure_user("dtaas_signals", "pw") == (True, "")
    assert run.call_args_list[1].args[0][-2:] == ["change_password", "dtaas_signals"]


def test_ensure_user_stops_when_the_list_fails(run):
    """No user is touched when the users cannot be listed"""
    run.return_value = _result(1, stderr="Error: no container")
    assert accounts.ensure_user("dtaas_signals", "pw")[0] is False
    assert run.call_count == 1


def test_grant_mqtt_account_limits_queues_and_topics(run):
    """Queue permissions name only the account's own session queues"""
    assert accounts.grant_mqtt_account("dtaas_signals", "^$", "^(SWiM)\\.") == (
        True,
        "",
    )
    queue_args = run.call_args_list[0].args[0]
    topic_args = run.call_args_list[1].args[0]
    assert queue_args[-6:-3] == ["-p", "/", "dtaas_signals"]
    assert queue_args[-3] == "^mqtt-subscription-dtaas_signals_.*$"
    assert re.match(queue_args[-1], "amq.topic")
    assert not re.match(queue_args[-1], "mqtt-subscription-swim_telegraf_xqos1")
    assert topic_args[-3:] == ["amq.topic", "^$", "^(SWiM)\\."]


def test_grant_mqtt_account_stops_after_a_failure(run):
    """Topic permissions are not set when queue permissions fail"""
    run.return_value = _result(1, stderr="no_such_user")
    assert accounts.grant_mqtt_account("x_user", "^$", "^$")[0] is False
    assert run.call_count == 1
