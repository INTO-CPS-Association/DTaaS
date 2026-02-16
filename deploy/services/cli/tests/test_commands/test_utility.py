"""Tests for utility functions used by service commands."""

# pylint: disable=redefined-outer-name
from unittest.mock import patch, Mock

import click
import pytest

from dtaas_services.commands.utility import (
    parse_service_list,
    _get_command_metadata,
    _print_operation_status,
    _handle_service_command,
    _check_thingsboard_if_starting,
    build_clean_confirmation_prompt,
    check_running_services_for_clean,
    print_clean_status,
    build_clean_status_message,
)

def test_parse_service_list_with_services():
    """Test parsing comma-separated service names"""
    result = parse_service_list("grafana,influxdb,mongodb")
    assert result == ["grafana", "influxdb", "mongodb"]


def test_parse_service_list_none():
    """Test parsing None returns None"""
    assert parse_service_list(None) is None


def test_get_command_metadata_start():
    """Test metadata for start command"""
    meta = _get_command_metadata("start")
    assert "start" in meta.name.lower()


def test_get_command_metadata_unknown():
    """Test metadata for unknown command raises ClickException"""
    with pytest.raises(click.ClickException) as exc_info:
        _get_command_metadata("unknown")
    assert "Unknown command" in str(exc_info.value)


def test_print_operation_status_with_service_list(capsys):
    """Test _print_operation_status with specific services"""
    from rich.console import Console
    from dtaas_services.commands.utility import OperationMeta

    console = Console()
    meta = OperationMeta("Starting", "cyan", "Starting containers...")
    _print_operation_status(console, meta, ["grafana", "influxdb"])


def test_handle_service_command_success():
    """Test _handle_service_command with successful operation"""
    from dtaas_services.commands.utility import OperationMeta

    meta = OperationMeta("Starting", "cyan", "Starting containers...")
    with patch("dtaas_services.commands.utility.Service"):
        _handle_service_command(
            lambda sl: (None, "Started successfully"), None, meta
        )


def test_handle_service_command_failure():
    """Test _handle_service_command raises ClickException on failure"""
    from dtaas_services.commands.utility import OperationMeta

    meta = OperationMeta("Starting", "cyan", "Starting containers...")
    with patch("dtaas_services.commands.utility.Service"):
        with pytest.raises(click.ClickException):
            _handle_service_command(
                lambda sl: (RuntimeError("fail"), "Docker error"), None, meta
            )


def test_handle_service_command_file_not_found():
    """Test _handle_service_command with FileNotFoundError"""
    from dtaas_services.commands.utility import OperationMeta

    meta = OperationMeta("Starting", "cyan", "Starting containers...")
    with patch(
        "dtaas_services.commands.utility.Service",
        side_effect=FileNotFoundError("Config not found"),
    ):
        with pytest.raises(click.ClickException):
            _handle_service_command(
                lambda sl: (None, "OK"), None, meta
            )


def test_check_thingsboard_if_starting_start():
    """Test _check_thingsboard_if_starting checks TB when starting"""
    service = Mock()
    service.get_all_containers.return_value = (None, {})
    with patch(
        "dtaas_services.commands.utility.check_thingsboard_installation"
    ) as mock_check:
        _check_thingsboard_if_starting("start", service, None)
    mock_check.assert_called_once()


def test_build_clean_confirmation_prompt_with_certs():
    """Test prompt with certs"""
    prompt = build_clean_confirmation_prompt(True)
    assert "Continue?" in prompt
    assert "cert" in prompt.lower()


def test_check_running_services_for_clean_specific_running():
    """Test check when specific targeted services are running"""
    from rich.console import Console

    console = Console()
    with pytest.raises(click.ClickException):
        check_running_services_for_clean(
            console, ["grafana"], ["grafana", "influxdb"]
        )


def test_check_running_services_for_clean_all_running():
    """Test check when any services are running and no filter"""
    from rich.console import Console

    console = Console()
    with pytest.raises(click.ClickException):
        check_running_services_for_clean(console, ["grafana"], None)


def test_check_running_services_for_clean_specific_not_running():
    """Test check when targeted services are not running"""
    from rich.console import Console

    console = Console()
    check_running_services_for_clean(
        console, ["mongodb"], ["grafana"]
    )


def test_print_clean_status_with_services(capsys):
    """Test print_clean_status with service list"""
    from rich.console import Console

    console = Console()
    print_clean_status(console, ["grafana", "influxdb"])


def test_print_clean_status_all_services(capsys):
    """Test print_clean_status without service list"""
    from rich.console import Console

    console = Console()
    print_clean_status(console, None)


def test_build_clean_status_message_with_certs():
    """Test status message with certs"""
    msg = build_clean_status_message(True)
    assert "cert" in msg.lower()


def test_build_clean_status_message_without_certs():
    """Test status message without certs"""
    msg = build_clean_status_message(False)
    assert "cert" not in msg.lower()
