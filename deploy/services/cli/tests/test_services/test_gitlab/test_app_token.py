"""Tests for GitLab OAuth application creation (app_token.py)."""

import json
import pytest
from dtaas_services.pkg.services.gitlab import app_token
from dtaas_services.pkg.services.gitlab.app_script import (
    APP_MARKER,
    INSTANCE_APP_MARKER,
    OAuthAppOptions,
)
from dtaas_services.pkg.services.gitlab.app_token import OAuthAppResult
# pylint: disable=W0212,W0621

SERVER = "DTaaS Server Authorization"
CLIENT = "DTaaS Client Authorization"
MOCK_OAUTH_JSON = [
    {
        "name": SERVER,
        "redirect_uri": "https://example.com/_oauth",
        "confidential": True,
        "scopes": "read_user",
        "trusted": False,
    },
    {
        "name": CLIENT,
        "redirect_uri": "https://example.com/Library",
        "confidential": False,
        "scopes": "api openid profile read_repository read_user",
        "trusted": True,
    },
]
SAVED = {
    "personal_access_token": "glpat-x",
    "server_app": {"client_id": "s-cid", "client_secret": "old-s"},
    "client_app": {"client_id": "c-cid", "client_secret": "old-c"},
}


def _app_line(app_id, name, uid, secret):
    data = {"id": app_id, "name": name, "uid": uid, "secret": secret}
    return f"{APP_MARKER}{json.dumps(data)}"


def _output(*lines):
    return "\n".join(["warning: something", *lines])


SERVER_LINE = _app_line(7, SERVER, "s-cid", "s-sec")
CLIENT_LINE = _app_line(8, CLIENT, "c-cid", "c-sec")


@pytest.fixture
def oauth_config(mocker):
    """Serve MOCK_OAUTH_JSON as the OAuth config file."""
    return mocker.patch.object(
        app_token, "_load_oauth_apps_config", return_value=MOCK_OAUTH_JSON
    )


@pytest.fixture
def mock_run(mocker):
    """Mock the gitlab-rails runner call."""
    return mocker.patch.object(app_token, "run_apps_script")


def _create(mock_run, output, saved=None):
    """Run create_oauth_applications on the given runner result."""
    mock_run.return_value = output
    return app_token.create_oauth_applications(OAuthAppOptions(), saved or {})


def test_load_oauth_apps_config_success(tmp_path, monkeypatch):
    """Test loading config from the default filename."""
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / "gitlab_oauth.json").write_text(json.dumps(MOCK_OAUTH_JSON))
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("OAUTH_APPS", raising=False)

    result = app_token._load_oauth_apps_config()
    assert len(result) == 2
    assert result[0]["name"] == SERVER


def test_load_oauth_apps_config_missing_file(tmp_path, monkeypatch):
    """Test FileNotFoundError when config file is absent."""
    (tmp_path / "config").mkdir()
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("OAUTH_APPS", raising=False)

    with pytest.raises(FileNotFoundError, match="gitlab_oauth.json"):
        app_token._load_oauth_apps_config()


def test_build_apps_config_missing_redirect_uri(mocker):
    """Test KeyError when redirect_uri is missing from an entry."""
    bad_data = [{"name": "Broken App", "confidential": False, "scopes": "api"}]
    mocker.patch.object(app_token, "_load_oauth_apps_config", return_value=bad_data)

    with pytest.raises(KeyError, match="redirect_uri"):
        app_token._build_apps_config()


@pytest.mark.usefixtures("oauth_config")
def test_new_apps_come_back_keyed_as_in_the_tokens_file(mock_run):
    """Server then client config go to one call; printed secrets are used"""
    options = OAuthAppOptions(rotate_secrets=True)
    mock_run.return_value = (True, _output(SERVER_LINE, CLIENT_LINE))
    outcome = app_token.create_oauth_applications(options, {})
    assert outcome.apps == {
        "server_app": OAuthAppResult(7, SERVER, "s-cid", "s-sec"),
        "client_app": OAuthAppResult(8, CLIENT, "c-cid", "c-sec"),
    }
    assert (outcome.errors, outcome.instance_apps) == ([], [])
    mock_run.assert_called_once_with(MOCK_OAUTH_JSON, options)


@pytest.mark.usefixtures("oauth_config")
def test_reused_apps_keep_the_saved_secret(mock_run):
    """An app printed without a secret takes the one saved for its client id"""
    output = _output(
        _app_line(7, SERVER, "s-cid", None), _app_line(8, CLIENT, "c-cid", None)
    )
    outcome = _create(mock_run, (True, output), SAVED)
    assert not outcome.errors
    assert outcome.apps["server_app"].client_secret == "old-s"
    assert outcome.apps["client_app"].client_secret == "old-c"


@pytest.mark.usefixtures("oauth_config")
@pytest.mark.parametrize("saved", [{}, {"server_app": {"client_id": "other"}}])
def test_reused_app_without_saved_secret_asks_for_rotation(mock_run, saved):
    """No saved secret for the client id: the app is not saved, the error says why"""
    output = _output(_app_line(7, SERVER, "s-cid", None), CLIENT_LINE)
    outcome = _create(mock_run, (True, output), saved)
    assert list(outcome.apps) == ["client_app"]
    assert len(outcome.errors) == 1
    assert "s-cid" in outcome.errors[0]
    assert "--rotate-secrets" in outcome.errors[0]


@pytest.mark.usefixtures("oauth_config")
def test_partial_output_keeps_the_printed_apps(mock_run):
    """One good line and one bad line: the good app is kept, both reasons given"""
    bad = f'{APP_MARKER}{{"id": 8, "secret": "c-sec"'
    outcome = _create(mock_run, (True, _output(SERVER_LINE, bad)))
    assert list(outcome.apps) == ["server_app"]
    assert outcome.errors == [
        f"unreadable {APP_MARKER} line (invalid JSON)",
        f"'{CLIENT}' missing from the gitlab-rails runner output",
    ]


@pytest.mark.usefixtures("oauth_config")
def test_instance_apps_are_reported(mock_run):
    """Same name instance wide apps printed by the script are passed on"""
    instance = f'{INSTANCE_APP_MARKER}{{"id": 3, "name": "{SERVER}", "uid": "old"}}'
    outcome = _create(mock_run, (True, _output(instance, SERVER_LINE, CLIENT_LINE)))
    assert outcome.instance_apps == [{"id": 3, "name": SERVER, "uid": "old"}]
    assert not outcome.errors


@pytest.mark.usefixtures("oauth_config")
def test_runner_failure_keeps_printed_apps_and_hides_secrets(mock_run):
    """A failed call still yields what was printed; its error has no secret"""
    outcome = _create(mock_run, (False, _output(SERVER_LINE, "Error: boom")))
    assert list(outcome.apps) == ["server_app"]
    assert outcome.errors == [
        "gitlab-rails runner failed: warning: something\nError: boom"
    ]


@pytest.mark.parametrize("kind, keep", [("Server", 1), ("Client", 0)])
def test_missing_app_config_fails_before_the_runner(mocker, mock_run, kind, keep):
    """A config without the server or client app fails before docker runs"""
    mocker.patch.object(
        app_token, "_load_oauth_apps_config", return_value=[MOCK_OAUTH_JSON[keep]]
    )
    outcome = _create(mock_run, (True, ""))
    assert not outcome.apps
    assert outcome.errors == [f"{kind} Authorization app not found in OAuth config"]
    mock_run.assert_not_called()
