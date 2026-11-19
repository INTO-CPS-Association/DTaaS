"""Fills a GitLab project from its template repository with git, on this host.

The template is cloned bare into a temporary folder (cloned_template), then
its default branch is pushed to the project (TemplateClone.push). The clone
comes first, so a template that cannot be used fails before any project is
created. No GitLab import is involved, so the instance needs no import source
enabled and never has to reach the template host itself.

The push authenticates with the user's own token (the PAT this CLI issued
them), never the admin's, so whatever a push sets off on GitLab (webhooks,
integrations) runs as the user. It also carries the push option ci.skip,
so it starts no CI pipeline. The admin token never reaches git.

The clone is checked by template_checks.py (no commits, Git LFS pointers)
before anything is pushed, and git itself runs through git_run.py, which
stops any command after GIT_TIMEOUT_SECONDS.

Git gets its settings through GIT_CONFIG_COUNT (git 2.31 or later), never on
the command line: the user's token rides in an HTTP header scoped to the
GitLab URL, so it is not in the process list, in a .git/config, or sent to
the template host. Prompts and credential helpers are off, so a template that
needs a login fails at once instead of waiting for input, and the admin's own
saved git credentials are never used. A transfer slower than
LOW_SPEED_LIMIT bytes a second for LOW_SPEED_SECONDS is aborted by git, so a
stalled host cannot hang 'user add'.
"""

import base64
import os
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass, replace
from pathlib import Path

from ...gitlab_common import with_hint
from .git_run import run_git
from .template_checks import template_problem

_ERROR_LINES = 3
LOW_SPEED_LIMIT = 1000
LOW_SPEED_SECONDS = 60
PUBLIC_TEMPLATES = "Templates are cloned without a login, so they must be public."


@dataclass(frozen=True)
class GitAccess:
    """How git reaches GitLab: the instance URL, the token a push
    authenticates with (the user's own, "" for a clone), and
    [gitlab].ssl_verify (True, False, or the path of a CA bundle)."""

    api_url: str
    token: str
    ssl_verify: object = True

    @classmethod
    def from_client(cls, gl):
        """The URL and TLS setting the admin GitLab client *gl* was built
        with, and no token: the admin token is never given to git."""
        return cls(gl.url, "", gl.ssl_verify)

    def project_url(self, path):
        """The Git over HTTP URL of the project *path* (namespace/project)."""
        return f"{self.api_url.rstrip('/')}/{path}.git"

    def auth_header(self):
        """The HTTP header that authenticates git as the token's owner."""
        basic = base64.b64encode(f"oauth2:{self.token}".encode()).decode("ascii")
        return f"Authorization: Basic {basic}"


def _config_pairs(access, auth):
    """The git settings of one command; *auth* adds *access*'s token."""
    scope = f"http.{access.api_url.rstrip('/')}"
    pairs = [
        ("credential.helper", ""),
        ("core.askPass", ""),
        ("http.lowSpeedLimit", str(LOW_SPEED_LIMIT)),
        ("http.lowSpeedTime", str(LOW_SPEED_SECONDS)),
    ]
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


def _scrubbed(text, access):
    """*text* with *access*'s token and its header value masked."""
    for secret in (access.auth_header(), access.token):
        if secret:
            text = text.replace(secret, "***")
    return text


def _git(args, env, access):
    """Run git; "" on success, else its last error lines, token masked."""
    done = run_git(args, env)
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


@dataclass(frozen=True)
class TemplateClone:
    """A template cloned by cloned_template; *error* says why it cannot be
    pushed, or is "" when it can."""

    access: GitAccess
    repo: str
    error: str

    def push(self, path, token):
        """Push the default branch to the project *path* (GitLab's
        path_with_namespace) as the owner of *token*, the user's own, with
        no CI pipeline; "" or why it failed."""
        access = replace(self.access, token=token)
        url = access.project_url(path)
        args = ["-C", self.repo, "push", "--quiet", "--no-verify"]
        args += ["-o", "ci.skip", url, "HEAD"]
        error = _git(args, git_env(access, auth=True), access)
        return with_hint(f"Could not push to {url}.", error) if error else ""


@contextmanager
def cloned_template(access, url):
    """Bare clone the template *url*, checked by template_problem.

    Yields a TemplateClone. The clone lives in a temporary folder that is
    removed when the block ends, failures and interruptions included. A
    removal that fails (on Windows, a git process stopped by the timeout can
    still hold a file) leaves that folder in the system temporary directory
    rather than hiding the git error.
    """
    with tempfile.TemporaryDirectory(
        prefix="dtaas-template-", ignore_cleanup_errors=True
    ) as tmp:
        repo = str(Path(tmp) / "template.git")
        error = _clone(access, url, repo) or template_problem(repo)
        yield TemplateClone(access, repo, error)
