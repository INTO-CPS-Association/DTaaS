"""Tests for the GitLab setup flow: first install, rerun and failures."""

import pytest
from dtaas_services.pkg.services.gitlab import setup
from dtaas_services.pkg.services.gitlab.app_script import OAuthAppOptions
# pylint: disable=W0212, W0621

SETUP = "dtaas_services.pkg.services.gitlab.setup"


@pytest.fixture
def healthy(mocker):
    """GitLab passes the health check."""
    return mocker.patch(f"{SETUP}._check_gitlab_health", return_value=(True, ""))


@pytest.fixture
def steps(mocker):
    """Mock the token steps and the first install steps."""
    return {
        "tokens": mocker.patch(f"{SETUP}._run_token_steps", return_value=(True, "")),
        "first": mocker.patch(
            f"{SETUP}._finish_first_install", return_value=(True, "")
        ),
    }


@pytest.mark.usefixtures("healthy")
@pytest.mark.parametrize("first_install", [True, False])
def test_setup_gitlab_resets_root_password_on_first_install_only(
    mocker, mock_console, mock_docker, steps, first_install
):
    """A rerun leaves root's password alone and says so"""
    mocker.patch(f"{SETUP}._is_first_install", return_value=first_install)
    success, msg = setup.setup_gitlab(mock_console, mock_docker)
    assert (success, msg) == (True, "GitLab setup completed successfully.")
    steps["tokens"].assert_called_once_with(
        mock_console, first_install, OAuthAppOptions()
    )
    assert steps["first"].called is first_install
    printed = " ".join(str(c.args[0]) for c in mock_console.print.call_args_list)
    assert ("left unchanged" in printed) is not first_install


@pytest.mark.usefixtures("healthy")
def test_setup_gitlab_passes_options(mocker, mock_console, mock_docker, steps):
    """The install flags reach the token steps"""
    mocker.patch(f"{SETUP}._is_first_install", return_value=False)
    options = OAuthAppOptions(rotate_secrets=True, replace_instance_apps=True)
    setup.setup_gitlab(mock_console, mock_docker, options)
    assert steps["tokens"].call_args.args[2] is options


def test_setup_gitlab_not_healthy(mock_console, mock_docker, healthy, steps):
    """A GitLab that is not ready returns its status and changes nothing"""
    healthy.return_value = (False, "starting")
    assert setup.setup_gitlab(mock_console, mock_docker) == (False, "starting")
    steps["tokens"].assert_not_called()


@pytest.mark.usefixtures("healthy")
def test_setup_gitlab_token_steps_fail(mocker, mock_console, mock_docker, steps):
    """A failed token step stops before the root password is touched"""
    mocker.patch(f"{SETUP}._is_first_install", return_value=True)
    steps["tokens"].return_value = (False, "rails error")
    assert setup.setup_gitlab(mock_console, mock_docker) == (False, "rails error")
    steps["first"].assert_not_called()


@pytest.mark.parametrize(
    "reset, backup, expected",
    [
        ((True, ""), (True, ""), (True, "")),
        ((False, "API error"), (True, ""), (False, "Root password reset failed")),
        ((True, ""), (False, "file error"), (False, "remove root password")),
    ],
)
def test_finish_first_install(mocker, mock_console, reset, backup, expected):
    """Reset, then backup; each failure is named"""
    mocker.patch(f"{SETUP}._step_reset_root_password", return_value=reset)
    mocker.patch(f"{SETUP}._step_remove_root_password_from_tokens", return_value=backup)
    success, msg = setup._finish_first_install(mock_console)
    assert success is expected[0]
    assert expected[1] in msg


@pytest.mark.parametrize("recorded, expected", [("", True), ("RootPass", False)])
def test_is_first_install(mocker, recorded, expected):
    """The first install is over once root's password has been recorded"""
    stored = mocker.patch(f"{SETUP}.get_current_password", return_value=recorded)
    assert setup._is_first_install() is expected
    stored.assert_called_once_with("GITLAB_ROOT_CURRENT_PASSWORD")


@pytest.mark.parametrize(
    "pat_result, expected", [((True, "saved"), (True, "")), ((False, "no pat"), None)]
)
def test_run_token_steps(mocker, mock_console, pat_result, expected):
    """The apps step runs, with the options, only after the PAT is saved"""
    mocker.patch(f"{SETUP}._step_password_and_pat", return_value=pat_result)
    apps = mocker.patch(f"{SETUP}.step_create_oauth_apps", return_value=(True, ""))
    options = OAuthAppOptions(rotate_secrets=True)
    result = setup._run_token_steps(mock_console, True, options)
    assert result == (expected or pat_result)
    assert apps.call_args_list == ([mocker.call(mock_console, options)] if expected else [])
