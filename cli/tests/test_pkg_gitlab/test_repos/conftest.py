"""Fixtures shared by the gitlab/repos.py tests: local repositories standing
in for the template and the GitLab project, and the admin access git is
given. Git is isolated by the isolated_git fixture of the parent conftest."""

import tempfile
from types import SimpleNamespace

import pytest
from src.pkg.gitlab.repos import GitAccess
from tests.test_pkg_gitlab.conftest import fixture_git

TOKEN = "fake-admin-token"  # noqa: S105 # NOSONAR
USER_TOKEN = "fake-user-token"  # noqa: S105 # NOSONAR
API_URL = "https://gitlab.example.com/gitlab"
# pylint: disable=redefined-outer-name


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


def _refs(project):
    """The refs of *project*, as {name: commit}."""
    out = fixture_git(
        "--git-dir", project, "for-each-ref", "--format=%(refname) %(objectname)"
    )
    return dict(line.split() for line in out.splitlines())


@pytest.fixture
def local(tmp_path, make_template):
    """A local 'GitLab' (tmp_path/srv) holding the empty bare project
    alice/common, which accepts push options as GitLab does, with helpers
    to make a template and read refs."""
    project = tmp_path / "srv" / "alice" / "common.git"
    fixture_git("init", "-q", "--bare", project)
    fixture_git("--git-dir", project, "config", "receive.advertisePushOptions", "true")
    return SimpleNamespace(
        access=GitAccess((tmp_path / "srv").as_posix(), TOKEN),
        project=project,
        template=make_template,
        refs=_refs,
        head=lambda repo: fixture_git("-C", repo, "rev-parse", "main"),
    )
