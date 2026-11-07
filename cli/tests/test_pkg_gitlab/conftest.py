"""Fixtures shared by the pkg/gitlab tests that run real git: git isolated
from the developer's own settings, and template repositories to clone."""

import subprocess

import pytest
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


def fixture_git(*args):
    """Run a fixture git command, failing the test when it fails."""
    return subprocess.run(
        ["git", *map(str, args)], check=True, capture_output=True, text=True
    ).stdout.strip()


@pytest.fixture
def make_template(tmp_path):
    """Make a template repository: *files* committed on 'main', then a 'dev'
    branch with one more commit. No files: a repository with no commit."""

    def make(files):
        repo = tmp_path / "template"
        fixture_git("init", "-q", "-b", "main", repo)
        if not files:
            return repo
        for name, content in files.items():
            (repo / name).parent.mkdir(parents=True, exist_ok=True)
            (repo / name).write_text(content, encoding="utf-8", newline="\n")
        fixture_git("-C", repo, "add", ".")
        fixture_git("-C", repo, "commit", "-q", "-m", "template")
        fixture_git("-C", repo, "checkout", "-q", "-b", "dev")
        fixture_git("-C", repo, "commit", "-q", "--allow-empty", "-m", "dev only")
        fixture_git("-C", repo, "checkout", "-q", "main")
        return repo

    return make
