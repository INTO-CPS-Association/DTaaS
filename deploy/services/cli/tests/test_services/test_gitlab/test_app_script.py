"""Tests for the OAuth apps runner script and its output (app_script.py)."""

import json
import pytest
from dtaas_services.pkg.services.gitlab import app_script
from dtaas_services.pkg.services.gitlab.app_script import OAuthAppOptions
from tests.test_services.test_gitlab.conftest import ruby_payload

SCRIPT = app_script.APPS_SCRIPT_HEAD + app_script.APPS_SCRIPT_TAIL
APP = {
    "name": "Server 'x' \\ y",
    "redirect_uri": "https://example.com/_oauth?a='1'",
    "confidential": True,
    "scopes": "read_user",
    "trusted": True,
}
SECRET = "s3cr3t-value"  # noqa: S105 # NOSONAR


def test_script_deletes_instance_apps_only_with_replace():
    """Same name instance wide apps are always listed, deleted only on request"""
    listed = SCRIPT.index("where(owner_id: nil, name: cfg['name']).to_a")
    deleted = SCRIPT.index("same.each(&:destroy!) if opts['replace']")
    reused = SCRIPT.index("root.oauth_applications.find_or_initialize_by(")
    assert listed < deleted < reused
    assert "User.find(1)" in SCRIPT


def test_script_renews_secret_only_with_rotate():
    """A reused app keeps its secret and prints none unless rotate is set"""
    keep = SCRIPT.index("keep = app.persisted? && !opts['rotate']")
    assert keep < SCRIPT.index("app.assign_attributes(cfg)")
    assert "app.renew_secret if app.persisted? && !keep" in SCRIPT
    assert "secret: (keep ? nil : app.plaintext_secret)" in SCRIPT


def test_script_prints_after_the_transaction():
    """Nothing is printed before the commit, so no secret of a rolled back run"""
    commit = SCRIPT.index("end end; ")
    assert SCRIPT.index("ActiveRecord::Base.transaction") < commit
    assert commit < SCRIPT.index("found.each") < SCRIPT.index("apps.each")


@pytest.mark.parametrize("options", [OAuthAppOptions(), OAuthAppOptions(True, True)])
def test_build_apps_script_passes_values_unchanged(options):
    """Quotes and backslashes cannot break out of the literal; flags arrive"""
    script = app_script.build_apps_script([APP], options)
    assert json.loads(ruby_payload(script)) == {
        "apps": [APP],
        "rotate": options.rotate_secrets,
        "replace": options.replace_instance_apps,
    }


def test_run_apps_script_uses_rails_runner(mocker):
    """The script runs in the gitlab container without echoing the command"""
    exec_mock = mocker.patch(
        f"{app_script.__name__}.execute_docker_command", return_value=(True, "out")
    )
    assert app_script.run_apps_script([APP], OAuthAppOptions()) == (True, "out")
    container, cmd, options = exec_mock.call_args.args
    assert container == "gitlab"
    assert cmd[:2] == ["gitlab-rails", "runner"]
    assert json.loads(ruby_payload(cmd[2]))["apps"] == [APP]
    assert options.verbose is False


@pytest.mark.parametrize(
    "line, reason",
    [
        (f'M={{"id": 1, "secret": "{SECRET}"', "invalid JSON"),
        (f'M=["{SECRET}"]', "no id, uid"),
        (f'M={{"id": 1, "secret": "{SECRET}"}}', "no uid"),
    ],
)
def test_parse_marked_reports_unreadable_lines(line, reason):
    """Good lines are kept; a bad line gets a reason that never quotes it"""
    output = "\n".join(["noise", '  M={"id": 7, "uid": "u"}  ', line])
    entries, errors = app_script.parse_marked(output, "M=", ("id", "uid"))
    assert entries == [{"id": 7, "uid": "u"}]
    assert errors == [f"unreadable M= line ({reason})"]
    assert SECRET not in errors[0]


@pytest.mark.parametrize(
    "output, expected",
    [
        (
            f'Error: boom\n {app_script.APP_MARKER}{{"secret": "{SECRET}"}}\n'
            f"{app_script.INSTANCE_APP_MARKER}{{}}\nat line 1",
            "Error: boom\nat line 1",
        ),
        (f"{app_script.APP_MARKER}{SECRET}", "no error output"),
    ],
)
def test_runner_error_drops_marked_lines(output, expected):
    """The error shown to the operator never carries a printed secret"""
    assert app_script.runner_error(output) == expected
