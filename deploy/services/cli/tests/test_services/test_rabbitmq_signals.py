"""Tests for the read-only RabbitMQ user of the signals gateway"""

import subprocess
from unittest.mock import Mock
import pytest
from dtaas_services.pkg.services import rabbitmq_signals
from dtaas_services.pkg.services.rabbitmq_signals import (
    get_signals_user,
    grant_signals_user,
    grant_signals_on_new_vhost,
    list_vhosts,
    setup_signals_user,
)
# pylint: disable=W0613, W0621

MODULE = "dtaas_services.pkg.services.rabbitmq_signals"


@pytest.fixture
def mock_exec(mocker):
    """Mock rabbitmqctl commands run with docker exec"""
    return mocker.patch(f"{MODULE}.execute_docker_command", return_value=(True, ""))


@pytest.fixture
def mock_run(mocker):
    """Mock the docker exec that reads the password on stdin"""
    return mocker.patch(
        f"{MODULE}.subprocess.run",
        return_value=Mock(returncode=0, stdout="", stderr=""),
    )


@pytest.fixture
def signals_user(mocker):
    """Name dtaas-signals in services.env"""
    return mocker.patch(f"{MODULE}.get_signals_user", return_value="dtaas-signals")


def _commands(mock_exec):
    return [call.args[1] for call in mock_exec.call_args_list]


def test_get_signals_user_reads_services_env(mocker):
    """The user name comes from SIGNALS_RABBITMQ_USER, without spaces"""
    config = mocker.patch(f"{MODULE}.Config")
    config.return_value.env = {"SIGNALS_RABBITMQ_USER": " dtaas-signals "}
    assert get_signals_user() == "dtaas-signals"


def test_get_signals_user_unset(mocker):
    """An unset key means no signals user"""
    mocker.patch(f"{MODULE}.Config").return_value.env = {}
    assert get_signals_user() == ""


def test_grant_signals_user_sets_the_documented_permissions(mock_exec):
    """The permissions equal those of servers/signals/DEVELOPER.md"""
    assert grant_signals_user("dtaas-signals", "alice") == (True, "")
    assert _commands(mock_exec) == [
        ["rabbitmqctl", "set_permissions", "-p", "alice", "dtaas-signals",
         r"^dtaas-signals\..*", r"^dtaas-signals\..*",
         r"^(amq\.topic|dtaas-signals\..*)$"],
        ["rabbitmqctl", "set_topic_permissions", "-p", "alice", "dtaas-signals",
         "amq.topic", "^$", ".*"],
    ]


def test_grant_signals_user_stops_when_permissions_fail(mock_exec):
    """No topic permission is set when the vhost permission fails"""
    mock_exec.return_value = (False, "no_such_vhost")
    success, error = grant_signals_user("dtaas-signals", "alice")
    assert success is False
    assert "Failed to grant dtaas-signals on vhost alice" in error
    assert mock_exec.call_count == 1


def test_grant_signals_user_topic_permission_fails(mock_exec):
    """A failed topic permission is reported"""
    mock_exec.side_effect = [(True, ""), (False, "error")]
    success, error = grant_signals_user("dtaas-signals", "alice")
    assert success is False
    assert "vhost alice: error" in error


def test_grant_on_new_vhost_without_signals_user(mocker, mock_exec):
    """Nothing is granted when services.env names no signals user"""
    mocker.patch(f"{MODULE}.get_signals_user", return_value="")
    assert grant_signals_on_new_vhost("alice") == (True, "")
    mock_exec.assert_not_called()


def test_grant_on_new_vhost_with_signals_user(signals_user, mock_exec):
    """The configured user is granted on the new vhost"""
    assert grant_signals_on_new_vhost("alice") == (True, "")
    assert mock_exec.call_count == 2


def test_list_vhosts(mock_exec):
    """Each line of list_vhosts is one vhost"""
    mock_exec.return_value = (True, "/\nalice\n\nbob\n")
    assert list_vhosts() == (True, ["/", "alice", "bob"], "")


def test_list_vhosts_fails(mock_exec):
    """A failed listing returns no vhost"""
    mock_exec.return_value = (False, "down")
    assert list_vhosts() == (False, [], "Failed to list vhosts: down")


def test_setup_signals_user_needs_the_user_name(mocker, mock_run):
    """Without SIGNALS_RABBITMQ_USER nothing is created"""
    mocker.patch(f"{MODULE}.get_signals_user", return_value="")
    success, message = setup_signals_user("secret")
    assert success is False
    assert "SIGNALS_RABBITMQ_USER" in message
    mock_run.assert_not_called()


def test_setup_signals_user_password_goes_on_stdin(signals_user, mock_run, mock_exec):
    """The password is never an argument of the command"""
    mock_exec.side_effect = [(True, "alice\nbob\n")] + [(True, "")] * 4
    success, message = setup_signals_user("secret")
    assert (success, message) == (True, "dtaas-signals can read 2 vhost(s)")
    args = mock_run.call_args
    assert "secret" not in " ".join(args.args[0])
    assert args.args[0][-2:] == ["add_user", "dtaas-signals"]
    assert args.kwargs["input"] == "secret\n"
    assert mock_exec.call_count == 5


def test_setup_signals_user_keeps_an_existing_user(signals_user, mock_run, mock_exec):
    """An existing user is granted again and keeps its password"""
    mock_run.return_value = Mock(returncode=70, stdout="", stderr="already exists")
    mock_exec.return_value = (True, "")
    assert setup_signals_user("secret") == (True, "dtaas-signals can read 0 vhost(s)")


def test_setup_signals_user_add_fails(signals_user, mock_run, mock_exec):
    """A failed add_user stops before any grant"""
    mock_run.return_value = Mock(returncode=69, stdout="", stderr="nodedown\nmore")
    success, message = setup_signals_user("secret")
    assert success is False
    assert message == "Failed to add user dtaas-signals: nodedown"
    mock_exec.assert_not_called()


def test_setup_signals_user_docker_missing(signals_user, mock_run):
    """A missing docker binary is reported"""
    mock_run.side_effect = OSError("docker not found")
    success, message = setup_signals_user("secret")
    assert success is False
    assert "docker not found" in message


def test_setup_signals_user_docker_timeout(signals_user, mock_run):
    """A broker that does not answer is reported"""
    mock_run.side_effect = subprocess.TimeoutExpired("docker", 60)
    success, _ = setup_signals_user("secret")
    assert success is False


def test_setup_signals_user_list_fails(signals_user, mock_run, mock_exec):
    """A failed vhost listing is reported"""
    mock_exec.return_value = (False, "down")
    assert setup_signals_user("secret") == (False, "Failed to list vhosts: down")


def test_setup_signals_user_grant_fails(signals_user, mock_run, mock_exec):
    """A failed grant stops the setup"""
    mock_exec.side_effect = [(True, "alice\n"), (False, "error")]
    success, message = setup_signals_user("secret")
    assert success is False
    assert "vhost alice" in message


def test_module_names_the_container():
    """The commands run in the rabbitmq container of compose.services.yml"""
    assert rabbitmq_signals.CONTAINER == "rabbitmq"
