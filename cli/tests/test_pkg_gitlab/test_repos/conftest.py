"""Fixtures shared by the gitlab/repos.py tests: git isolated from the
developer's own settings, local repositories standing in for the template
and the GitLab project, and the admin access git is given."""

import subprocess
import tempfile
from types import SimpleNamespace

import pytest
from src.pkg.gitlab.repos import GitAccess

TOKEN = "fake-admin-token"  # noqa: S105 # NOSONAR
API_URL = "https://gitlab.example.com/gitlab"
# pylint: disable=redefined-outer-name


@pytest.fixture(autouse=True)
def isolated_git(tmp_path, monkeypatch):
    """Keep the developer's own git settings (signing, hooks, URL rewrites,
    credential helpers) out of these tests, and give fixture commits an
    identity."""
    empty = tmp_path / "empty.gitconfig"
    empty.write_text("", encoding="utf-8")
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", str(empty))
    monkeypatch.setenv("GIT_CONFIG_NOSYSTEM", "1")
    for role in ("AUTHOR", "COMMITTER"):
        monkeypatch.setenv(f"GIT_{role}_NAME", "test")
        monkeypatch.setenv(f"GIT_{role}_EMAIL", "test@example.com")


@pytest.fixture
def access():
    """The admin access git gets for a GitLab at API_URL."""
    return GitAccess(API_URL, TOKEN)


@pytest.fixture
def scratch(tmp_path, monkeypatch):
    """An empty folder that every temporary directory goes into."""
    folder = tmp_path / "tmp"
    folder.mkdir()
    monkeypatch.setattr(tempfile, "tempdir", str(folder))
    return folder


def _git(*args):
    """Run a fixture git command, failing the test when it fails."""
    return subprocess.run(
        ["git", *map(str, args)], check=True, capture_output=True, text=True
    ).stdout.strip()


def _template(root, files):
    """A template repository: *files* committed on 'main', then a 'dev'
    branch with one more commit. No files: a repository with no commit."""
    repo = root / "template"
    _git("init", "-q", "-b", "main", repo)
    if not files:
        return repo
    for name, content in files.items():
        (repo / name).write_text(content, encoding="utf-8")
    _git("-C", repo, "add", ".")
    _git("-C", repo, "commit", "-q", "-m", "template")
    _git("-C", repo, "checkout", "-q", "-b", "dev")
    _git("-C", repo, "commit", "-q", "--allow-empty", "-m", "dev only")
    _git("-C", repo, "checkout", "-q", "main")
    return repo


def _refs(project):
    """The refs of *project*, as {name: commit}."""
    out = _git(
        "--git-dir", project, "for-each-ref", "--format=%(refname) %(objectname)"
    )
    return dict(line.split() for line in out.splitlines())


@pytest.fixture
def local(tmp_path):
    """A local 'GitLab' (tmp_path/srv) holding the empty bare project
    alice/common, with helpers to make a template and read refs."""
    project = tmp_path / "srv" / "alice" / "common.git"
    _git("init", "-q", "--bare", project)
    return SimpleNamespace(
        access=GitAccess((tmp_path / "srv").as_posix(), TOKEN),
        project=project,
        template=lambda files: _template(tmp_path, files),
        refs=_refs,
        head=lambda repo: _git("-C", repo, "rev-parse", "main"),
    )
