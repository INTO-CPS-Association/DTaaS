"""Tests for the OAuth apps install step (app_setup.py)."""

import json
from dataclasses import asdict
import pytest
from dtaas_services.pkg.services.gitlab import app_setup
from dtaas_services.pkg.services.gitlab.app_script import OAuthAppOptions
from dtaas_services.pkg.services.gitlab.app_token import OAuthAppsOutcome
from tests.test_services.test_gitlab.conftest import write_text
# pylint: disable=W0621

INSTANCE_APP = {"id": 3, "name": "Server App", "uid": "old-cid"}


@pytest.fixture
def mock_create(mocker):
    """Mock the runner call behind the step."""
    return mocker.patch.object(app_setup, "create_oauth_applications")


@pytest.fixture
def both_apps(sample_server_result, sample_client_result):
    """Outcome with both apps and no error."""
    return OAuthAppsOutcome(
        apps={"server_app": sample_server_result, "client_app": sample_client_result}
    )


def _printed(console):
    return " ".join(str(c.args[0]) for c in console.print.call_args_list)


def _saved(tokens_path):
    return json.loads(tokens_path.read_text(encoding="utf-8"))


def test_step_saves_apps_and_passes_options(
    mock_console, mock_create, both_apps, tokens_path
):
    """Both apps are saved; the flags and saved tokens reach the runner call"""
    write_text(tokens_path, json.dumps({"personal_access_token": "tok"}))
    mock_create.return_value = both_apps
    options = OAuthAppOptions(rotate_secrets=True)
    assert app_setup.step_create_oauth_apps(mock_console, options) == (True, "")
    mock_create.assert_called_once_with(options, {"personal_access_token": "tok"})
    saved = _saved(tokens_path)
    assert saved["server_app"] == asdict(both_apps.apps["server_app"])
    assert saved["client_app"] == asdict(both_apps.apps["client_app"])
    assert "User Settings > Applications" in _printed(mock_console)


@pytest.mark.parametrize(
    "case",
    [
        ((), "New credentials for Server App, Client App"),
        (("server_app",), "New credentials for Client App saved"),
        (("server_app", "client_app"), None),
    ],
)
def test_step_names_apps_with_new_credentials(
    mock_console, mock_create, both_apps, tokens_path, case
):
    """Only apps whose client id or secret changed need copying to DTaaS"""
    saved_keys, hint = case
    saved = {k: asdict(both_apps.apps[k]) for k in saved_keys}
    write_text(tokens_path, json.dumps(saved))
    mock_create.return_value = both_apps
    app_setup.step_create_oauth_apps(mock_console, OAuthAppOptions())
    printed = _printed(mock_console)
    assert (hint in printed) if hint else ("New credentials" not in printed)


@pytest.mark.usefixtures("tokens_path")
@pytest.mark.parametrize(
    "replace, verb, hint", [(True, "Deleted", False), (False, "Kept", True)]
)
def test_step_lists_instance_apps(mock_console, mock_create, replace, verb, hint):
    """Same name instance wide apps are listed as deleted or kept"""
    mock_create.return_value = OAuthAppsOutcome(instance_apps=[INSTANCE_APP])
    app_setup.step_create_oauth_apps(mock_console, OAuthAppOptions(False, replace))
    printed = _printed(mock_console)
    assert f"{verb} instance wide app 'Server App' (id 3, client id old-cid)" in printed
    assert ("--replace-instance-apps" in printed) is hint


def test_step_saves_printed_apps_when_it_fails(
    mock_console, mock_create, sample_server_result, tokens_path
):
    """A partial outcome is saved before the error is returned"""
    mock_create.return_value = OAuthAppsOutcome(
        apps={"server_app": sample_server_result}, errors=["one", "two"]
    )
    assert app_setup.step_create_oauth_apps(mock_console, OAuthAppOptions()) == (
        False,
        "one; two",
    )
    assert _saved(tokens_path)["server_app"] == asdict(sample_server_result)


@pytest.mark.usefixtures("tokens_path")
def test_step_reports_a_failed_save(mocker, mock_console, mock_create, both_apps):
    """A save error fails the step, without telling to copy unsaved secrets"""
    mock_create.return_value = both_apps
    mocker.patch.object(app_setup, "merge_tokens", return_value=(False, "disk full"))
    result = app_setup.step_create_oauth_apps(mock_console, OAuthAppOptions())
    assert result == (False, "disk full")
    assert "New credentials" not in _printed(mock_console)


def test_step_stops_on_an_unreadable_tokens_file(mock_console, mock_create, tokens_path):
    """Kept secrets come from the tokens file, so it must be readable first"""
    write_text(tokens_path, "{not json")
    success, error = app_setup.step_create_oauth_apps(mock_console, OAuthAppOptions())
    assert success is False
    assert error.startswith("Failed to read")
    mock_create.assert_not_called()
