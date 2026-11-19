"""Tests for the settings git runs with: where the push token goes, TLS,
prompts, and what reaches the output. Git itself is asked which setting it
applies to which URL (git config --get-urlmatch)."""

import base64
import subprocess
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from src.pkg.gitlab import repos
from src.pkg.gitlab.repos import GitAccess, TemplateClone, git_env
from tests.test_pkg_gitlab.test_repos.conftest import USER_TOKEN

TEMPLATE_HOST_URL = "https://gitlab.com/dtaas/common.git"


def _urlmatch(env, key, url):
    """The value git applies for *key* to *url* under *env*, or None."""
    done = subprocess.run(
        ["git", "config", "--get-urlmatch", key, url],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    return done.stdout.strip() if done.returncode == 0 else None


def test_the_token_header_reaches_only_the_gitlab_host(access):
    """Git applies the header to the GitLab URL and its projects, never to
    the template host, and the clone gets no header at all."""
    push_env = git_env(access, auth=True)
    project = access.project_url("alice/common")

    header = _urlmatch(push_env, "http.extraHeader", project)
    assert header == access.auth_header()
    assert base64.b64decode(header.split()[-1]).decode() == f"oauth2:{access.token}"
    assert _urlmatch(push_env, "http.extraHeader", TEMPLATE_HOST_URL) is None
    assert _urlmatch(git_env(access), "http.extraHeader", project) is None
    assert access.token not in "".join(push_env.values())


@pytest.mark.parametrize(
    "ssl_verify,key,value",
    [
        (False, "http.sslVerify", "false"),
        ("/etc/ssl/corp-ca.pem", "http.sslCAInfo", "/etc/ssl/corp-ca.pem"),
    ],
    ids=["off", "ca-bundle"],
)
def test_ssl_verify_applies_to_the_gitlab_host_only(access, ssl_verify, key, value):
    """[gitlab].ssl_verify reaches git for the GitLab host, a template there
    included, and not for any other host."""
    env = git_env(GitAccess(access.api_url, access.token, ssl_verify))
    assert _urlmatch(env, key, f"{access.api_url}/dtaas/common.git") == value
    assert _urlmatch(env, key, TEMPLATE_HOST_URL) is None


def test_git_never_prompts(access, monkeypatch):
    """No terminal prompt, no askpass program, no saved credentials, and
    TLS left at git's default unless ssl_verify says otherwise."""
    monkeypatch.setenv("GIT_ASKPASS", "/usr/bin/ide-askpass")
    env = git_env(access)
    assert env["GIT_TERMINAL_PROMPT"] == "0"
    assert "GIT_ASKPASS" not in env
    for key in ("credential.helper", "core.askPass"):
        assert _urlmatch(env, key, TEMPLATE_HOST_URL) == ""
    assert "sslVerify" not in "".join(env.values())


@pytest.mark.parametrize("auth", [False, True], ids=["clone", "push"])
def test_a_stalled_transfer_is_aborted(access, auth):
    """Git gives up on any host, the template's included, once a transfer
    stays under 1000 bytes a second for a minute."""
    env = git_env(access, auth=auth)
    for url in (TEMPLATE_HOST_URL, access.project_url("alice/common")):
        assert _urlmatch(env, "http.lowSpeedLimit", url) == "1000"
        assert _urlmatch(env, "http.lowSpeedTime", url) == "60"


def test_git_errors_never_show_the_token(access):
    """Whatever git prints, the token and the header carrying it are masked."""
    printed = f"fatal: {access.auth_header()}\nfatal: token {access.token} refused\n"
    failed = subprocess.CompletedProcess([], 128, "", printed)
    with patch("src.pkg.gitlab.repos.run_git", return_value=failed):
        error = repos._git(["push"], {}, access)  # pylint: disable=protected-access
    assert access.token not in error
    assert access.auth_header().split()[-1] not in error
    assert error.count("***") == 2


def _admin_client(access, ssl_verify=True):
    """The admin GitLab client's settings, holding the admin token."""
    return SimpleNamespace(
        url=access.api_url, private_token=access.token, ssl_verify=ssl_verify
    )


def test_access_comes_from_the_admin_client_without_its_token(access):
    """git gets the URL and TLS setting the admin client has, never the
    admin token, and a trailing slash on the URL does not double up."""
    from_client = GitAccess.from_client(_admin_client(access, "/ca.pem"))
    assert from_client == GitAccess(access.api_url, "", "/ca.pem")
    slashed = GitAccess(f"{access.api_url}/", access.token)
    assert slashed.project_url("alice/user") == f"{access.api_url}/alice/user.git"


def test_the_push_authenticates_as_the_user(access):
    """The push carries the user's token in the header for the GitLab host,
    asks for no pipeline, and the admin token is nowhere in its settings."""
    clone = TemplateClone(GitAccess.from_client(_admin_client(access)), "t.git", "")
    pushed = subprocess.CompletedProcess([], 0, "", "")
    with patch("src.pkg.gitlab.repos.run_git", return_value=pushed) as run:
        assert clone.push("alice/common", USER_TOKEN) == ""
    args, env = run.call_args.args
    as_user = GitAccess(access.api_url, USER_TOKEN)
    project = access.project_url("alice/common")
    assert _urlmatch(env, "http.extraHeader", project) == as_user.auth_header()
    assert args[-4:] == ["-o", "ci.skip", project, "HEAD"]
    assert access.token not in "".join(env.values())
    assert GitAccess(access.api_url, access.token).auth_header() not in env.values()
