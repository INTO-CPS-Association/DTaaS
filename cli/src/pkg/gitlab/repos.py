"""Fills a GitLab project from its template repository with git, on this host.

The template is cloned bare into a temporary folder, then its default branch
is pushed to the project. No GitLab import is involved, so the instance needs
no import source enabled and never has to reach the template host itself.

A bare clone checks nothing out, so no Git LFS filter runs. LFS is not
supported: a template whose default branch holds LFS pointer files is
refused, rather than giving users the pointers instead of their files.

Git gets its settings through GIT_CONFIG_COUNT (git 2.31 or later), never on
the command line: the admin token rides in an HTTP header scoped to the
GitLab URL, so it is not in the process list, in a .git/config, or sent to
the template host. Prompts and credential helpers are off, so a template that
needs a login fails at once instead of waiting for input, and the admin's own
saved git credentials are never used.
"""

import base64
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from ...gitlab_common import with_hint

MIN_GIT_VERSION = (2, 31)
LFS_POINTER_LINE = "^version https://git-lfs.github.com/spec/v1"
_ERROR_LINES = 3
_LISTED_FILES = 3
PUBLIC_TEMPLATES = "Templates are cloned without a login, so they must be public."


@dataclass(frozen=True)
class GitAccess:
    """How git reaches GitLab: the instance URL, the admin token, and
    [gitlab].ssl_verify (True, False, or the path of a CA bundle)."""

    api_url: str
    token: str
    ssl_verify: object = True

    @classmethod
    def from_client(cls, gl):
        """The settings the admin GitLab client *gl* was built with."""
        return cls(gl.url, gl.private_token, gl.ssl_verify)

    def project_url(self, path):
        """The Git over HTTP URL of the project *path* (namespace/project)."""
        return f"{self.api_url.rstrip('/')}/{path}.git"

    def auth_header(self):
        """The HTTP header that authenticates git as the token's owner."""
        basic = base64.b64encode(f"oauth2:{self.token}".encode()).decode("ascii")
        return f"Authorization: Basic {basic}"


@dataclass(frozen=True)
class TemplateCopy:
    """One template to push: where it is cloned from, and the project path."""

    template_url: str
    project_path: str


def _config_pairs(access, auth):
    """The git settings of one command; *auth* adds the admin token."""
    scope = f"http.{access.api_url.rstrip('/')}"
    pairs = [("credential.helper", ""), ("core.askPass", "")]
    if access.ssl_verify is False:
        pairs.append((f"{scope}.sslVerify", "false"))
    elif isinstance(access.ssl_verify, str):
        pairs.append((f"{scope}.sslCAInfo", access.ssl_verify))
    if auth:
        pairs.append((f"{scope}.extraHeader", access.auth_header()))
    return pairs


def git_env(access, auth=False):
    """The environment of one git command: no prompts, and its settings in
    GIT_CONFIG_* variables rather than on the command line."""
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    for name in ("GIT_ASKPASS", "SSH_ASKPASS"):
        env.pop(name, None)
    pairs = _config_pairs(access, auth)
    env["GIT_CONFIG_COUNT"] = str(len(pairs))
    for index, (key, value) in enumerate(pairs):
        env[f"GIT_CONFIG_KEY_{index}"] = key
        env[f"GIT_CONFIG_VALUE_{index}"] = value
    return env


def _run(args, env=None):
    """Run git with *args*, capturing its output as text."""
    return subprocess.run(
        ["git", *args],
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


def git_problem():
    """Why git cannot be used here, or "" when it is installed and new enough.

    Checked once per run, before any project is touched.
    """
    try:
        version = _run(["--version"]).stdout.strip()
    except OSError:
        return "git is not installed, or not on PATH."
    match = re.match(r"git version (\d+)\.(\d+)", version)
    if match and tuple(int(part) for part in match.groups()) >= MIN_GIT_VERSION:
        return ""
    return f"'{version}' is too old: git 2.31 or later is needed."


def _scrubbed(text, access):
    """*text* with the admin token and its header value masked."""
    for secret in (access.auth_header(), access.token):
        if secret:
            text = text.replace(secret, "***")
    return text


def _git(args, env, access):
    """Run git; "" on success, else its last error lines, token masked."""
    done = _run(args, env)
    if done.returncode == 0:
        return ""
    lines = [line for line in done.stderr.splitlines() if line.strip()]
    detail = "\n".join(lines[-_ERROR_LINES:]) or f"git exited with {done.returncode}."
    return _scrubbed(detail, access)


def _clone(access, url, repo):
    """Bare clone *url* into *repo*; "" or why it failed."""
    error = _git(
        ["clone", "--bare", "--quiet", "--", url, repo], git_env(access), access
    )
    detail = f"{error}\n{PUBLIC_TEMPLATES}"
    return with_hint(f"Could not clone {url}.", detail) if error else ""


def _lfs_problem(repo, access):
    """Why the default branch of *repo* cannot be pushed as it is (it holds
    Git LFS pointer files), or ""."""
    done = _run(["-C", repo, "grep", "-I", "-l", "-e", LFS_POINTER_LINE, "HEAD", "--"])
    if done.returncode == 1:
        return ""
    if done.returncode != 0:
        detail = _scrubbed(done.stderr.strip(), access)
        return with_hint("Could not read the template's default branch.", detail)
    files = [line.split(":", 1)[-1] for line in done.stdout.splitlines()]
    return with_hint(
        "The template uses Git LFS, which is not supported.",
        "LFS pointer files: " + ", ".join(files[:_LISTED_FILES]),
    )


def _push(access, repo, path):
    """Push the default branch of *repo* to the project *path*."""
    url = access.project_url(path)
    args = ["-C", repo, "push", "--quiet", "--no-verify", url, "HEAD"]
    error = _git(args, git_env(access, auth=True), access)
    return with_hint(f"Could not push to {url}.", error) if error else ""


def copy_template(access, copy):
    """Clone *copy*'s template and push its default branch to its project.

    The clone lives in a temporary folder that is removed on every path,
    failures and interruptions included.

    Returns:
        "" on success, else why it failed.
    """
    with tempfile.TemporaryDirectory(prefix="dtaas-template-") as tmp:
        repo = str(Path(tmp) / "template.git")
        return (
            _clone(access, copy.template_url, repo)
            or _lfs_problem(repo, access)
            or _push(access, repo, copy.project_path)
        )
