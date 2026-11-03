"""Tests for the user add-signals command"""

import pytest
from dtaas_services.cmd import services
# pylint: disable=W0613, W0621

SETUP = "dtaas_services.commands.signals_ops.setup_signals_user"
TOKENS = "dtaas_services.commands.signals_ops.setup_signals_tokens"


@pytest.fixture
def mock_setup(mocker):
    """Mock the creation of the service user"""
    return mocker.patch(SETUP, return_value=(True, "dtaas-signals can read 2 vhost(s)"))


@pytest.fixture(autouse=True)
def mock_tokens(mocker):
    """Mock the InfluxDB tokens, which are off unless services.env names a file"""
    return mocker.patch(TOKENS, return_value=(True, ""))


def test_add_signals_reads_the_password_file(runner, mock_setup, tmp_path):
    """The password comes from the file, without its newline"""
    password_file = tmp_path / "password"
    password_file.write_text("secret\n", encoding="utf-8")
    result = runner.invoke(
        services, ["user", "add-signals", "--password-file", str(password_file)]
    )
    assert result.exit_code == 0
    mock_setup.assert_called_once_with("secret")
    assert "dtaas-signals can read 2 vhost(s)" in result.output
    assert "secret" not in result.output


def test_add_signals_prompts_without_echo(runner, mock_setup):
    """Without a file the password is prompted for twice and not shown"""
    result = runner.invoke(services, ["user", "add-signals"], input="secret\nsecret\n")
    assert result.exit_code == 0
    mock_setup.assert_called_once_with("secret")
    assert "secret" not in result.output


def test_add_signals_refuses_an_empty_file(runner, mock_setup, tmp_path):
    """An empty password file is refused before anything is created"""
    password_file = tmp_path / "password"
    password_file.write_text("\n", encoding="utf-8")
    result = runner.invoke(
        services, ["user", "add-signals", "--password-file", str(password_file)]
    )
    assert result.exit_code != 0
    assert "The password is empty" in result.output
    mock_setup.assert_not_called()


def test_add_signals_reports_a_failure(runner, mock_setup, tmp_path):
    """A failed setup exits with an error and its message"""
    mock_setup.return_value = (False, "Set SIGNALS_RABBITMQ_USER first")
    password_file = tmp_path / "password"
    password_file.write_text("secret", encoding="utf-8")
    result = runner.invoke(
        services, ["user", "add-signals", "--password-file", str(password_file)]
    )
    assert result.exit_code == 1
    assert "Set SIGNALS_RABBITMQ_USER first" in result.output


def test_add_signals_has_no_password_argument(runner, mock_setup):
    """The password cannot be given on the command line"""
    result = runner.invoke(services, ["user", "add-signals", "--password", "secret"])
    assert result.exit_code == 2
    mock_setup.assert_not_called()


def test_add_signals_writes_influx_tokens(runner, mock_setup, mock_tokens, tmp_path):
    """With a tokens file configured, the InfluxDB tokens are reported"""
    mock_tokens.return_value = (True, "1 new read-only token(s), 1 org(s) in f")
    password_file = tmp_path / "password"
    password_file.write_text("secret", encoding="utf-8")
    result = runner.invoke(
        services, ["user", "add-signals", "--password-file", str(password_file)]
    )
    assert result.exit_code == 0
    assert "InfluxDB: 1 new read-only token(s)" in result.output


def test_add_signals_reports_an_influx_failure(runner, mock_setup, mock_tokens, tmp_path):
    """A failure to write the InfluxDB tokens exits with an error"""
    mock_tokens.return_value = (False, "Cannot write f: PermissionError")
    password_file = tmp_path / "password"
    password_file.write_text("secret", encoding="utf-8")
    result = runner.invoke(
        services, ["user", "add-signals", "--password-file", str(password_file)]
    )
    assert result.exit_code == 1
    assert "Cannot write f: PermissionError" in result.output
