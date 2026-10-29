"""Tests for GitLab OAuth application creation (app_token.py)."""

import json
import re
from dataclasses import asdict
import pytest
from dtaas_services.pkg.services.gitlab import app_token
# pylint: disable=W0212,W0621

MOCK_OAUTH_JSON = [
    {
        "name": "DTaaS Server Authorization",
        "redirect_uri": "https://example.com/_oauth",
        "confidential": True,
        "scopes": "read_user",
        "trusted": False,
    },
    {
        "name": "DTaaS Client Authorization",
        "redirect_uri": "https://example.com/Library",
        "confidential": False,
        "scopes": "api openid profile read_repository read_user",
        "trusted": True,
    },
]


def _app_line(app_id, name, uid, secret):
    data = {"id": app_id, "name": name, "uid": uid, "secret": secret}
    return f"{app_token.APP_MARKER}{json.dumps(data)}"


RAILS_OUTPUT = "\n".join(
    [
        "warning: something",
        _app_line(7, "DTaaS Server Authorization", "s-cid", "s-sec"),
        _app_line(8, "DTaaS Client Authorization", "c-cid", "c-sec"),
    ]
)


def _ruby_payload(script):
    """Return the JSON text the script hands to JSON.parse, as Ruby reads it."""
    literal = script.removeprefix(app_token.APPS_SCRIPT_HEAD)
    literal = literal.removesuffix(app_token.APPS_SCRIPT_TAIL)
    return re.sub(r"\\([\\'])", r"\1", literal)


@pytest.fixture
def oauth_config(mocker):
    """Serve MOCK_OAUTH_JSON as the OAuth config file."""
    return mocker.patch.object(
        app_token, "_load_oauth_apps_config", return_value=MOCK_OAUTH_JSON
    )


@pytest.fixture
def mock_docker_exec(mocker):
    """Mock the docker exec call that runs gitlab-rails."""
    return mocker.patch(
        "dtaas_services.pkg.services.gitlab.app_token.execute_docker_command"
    )


def test_load_oauth_apps_config_success(tmp_path, monkeypatch):
    """Test loading config from the default filename."""
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / "gitlab_oauth.json").write_text(json.dumps(MOCK_OAUTH_JSON))
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("OAUTH_APPS", raising=False)

    result = app_token._load_oauth_apps_config()
    assert len(result) == 2
    assert result[0]["name"] == "DTaaS Server Authorization"


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


def test_apps_script_replaces_instance_apps_with_root_owned_ones():
    """Same name instance wide apps go, root's app is reused or created"""
    script = app_token.APPS_SCRIPT_HEAD + app_token.APPS_SCRIPT_TAIL
    destroy = script.index("where(owner_id: nil, name: cfg['name']).destroy_all")
    reuse = script.index("root.oauth_applications.find_or_initialize_by(")
    assert "User.find(1)" in script
    assert "ActiveRecord::Base.transaction" in script
    assert destroy < reuse
    assert "renew_secret if app.persisted?" in script
    assert script.index("app.save!") < script.index("apps.each")


def test_apps_script_passes_config_values_unchanged():
    """Quotes and backslashes in the config cannot break out of the literal"""
    config = app_token.OAuthAppConfig(
        name="Server 'x' \\ y",
        redirect_uri="https://example.com/_oauth?a='1'",
        confidential=True,
        scopes="read_user",
        trusted=True,
    )
    script = app_token._build_apps_script([config])
    assert json.loads(_ruby_payload(script)) == [asdict(config)]


def test_create_oauth_applications_success(oauth_config, mock_docker_exec):
    """Both apps come back in server, client order from one rails call"""
    mock_docker_exec.return_value = (True, RAILS_OUTPUT)
    success, apps, error = app_token.create_oauth_applications()
    assert (success, error) == (True, "")
    assert [a.client_id for a in apps] == ["s-cid", "c-cid"]
    assert apps[0] == app_token.OAuthAppResult(
        7, "DTaaS Server Authorization", "s-cid", "s-sec"
    )
    container, cmd, options = mock_docker_exec.call_args.args
    assert container == "gitlab"
    assert cmd[:2] == ["gitlab-rails", "runner"]
    assert json.loads(_ruby_payload(cmd[2])) == oauth_config.return_value
    assert options.verbose is False


@pytest.mark.usefixtures("oauth_config")
def test_create_oauth_applications_docker_failure(mock_docker_exec):
    """A failed gitlab-rails call is reported with its error"""
    mock_docker_exec.return_value = (False, "ActiveRecord::RecordInvalid")
    success, apps, error = app_token.create_oauth_applications()
    assert (success, apps) == (False, [])
    assert "gitlab-rails runner" in error
    assert "RecordInvalid" in error


@pytest.mark.usefixtures("oauth_config")
@pytest.mark.parametrize(
    "output", ["", "done\n", _app_line(7, "DTaaS Server Authorization", "s", "x")]
)
def test_create_oauth_applications_incomplete_output(mock_docker_exec, output):
    """Output without both marked apps is a failure"""
    mock_docker_exec.return_value = (True, output)
    assert app_token.create_oauth_applications() == (
        False,
        [],
        "No OAuth applications in the gitlab-rails runner output",
    )


@pytest.mark.parametrize("kind, keep", [("Server", 1), ("Client", 0)])
def test_create_oauth_applications_missing_app(mocker, mock_docker_exec, kind, keep):
    """A config without the server or client app fails before docker runs"""
    mocker.patch.object(
        app_token, "_load_oauth_apps_config", return_value=[MOCK_OAUTH_JSON[keep]]
    )
    success, apps, error = app_token.create_oauth_applications()
    assert (success, apps) == (False, [])
    assert error == f"{kind} Authorization app not found in OAuth config"
    mock_docker_exec.assert_not_called()
