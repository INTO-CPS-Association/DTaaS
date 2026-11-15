"""Tests for a pinned template commit (cloned_template with a commit): a real
git clone and push between local repositories, so no network is needed."""

import subprocess

import pytest
from gitlab_common import repos
from tests.conftest import LFS_POINTER, fixture_git
from tests.test_repos.conftest import copy_template


def _commit_on_dev(template, files=None):
    """Commit *files* on the template's dev branch, away from its default
    branch main, and return the new commit's id."""
    fixture_git("-C", template, "checkout", "-q", "dev")
    for name, content in (files or {}).items():
        (template / name).write_text(content, encoding="utf-8", newline="\n")
    fixture_git("-C", template, "add", ".")
    fixture_git("-C", template, "commit", "-q", "--allow-empty", "-m", "pinned")
    commit = fixture_git("-C", template, "rev-parse", "HEAD")
    fixture_git("-C", template, "checkout", "-q", "main")
    return commit


@pytest.mark.parametrize("case", [str.lower, str.upper], ids=["lower", "upper"])
def test_the_pinned_commit_is_pushed_as_the_default_branch(local, scratch, case):
    """Exactly the pinned commit becomes the project's default branch,
    whatever the template's default branch holds now, in either case."""
    template = local.template({"README.md": "x\n"})
    pinned = _commit_on_dev(template)

    assert copy_template(local, template, commit=case(pinned)) == ""
    assert local.refs(local.project) == {"refs/heads/main": pinned}
    assert pinned != local.head(template)
    assert not list(scratch.iterdir())


def test_the_checks_run_on_the_pinned_commit(local):
    """The template checks see the pinned commit, not the default branch:
    LFS pointers there are refused, and nothing is pushed."""
    template = local.template({"README.md": "x\n"})
    pinned = _commit_on_dev(template, {"model.fmu": LFS_POINTER})

    error = copy_template(local, template, commit=pinned)

    assert error.startswith("The template uses Git LFS, which is not supported.")
    assert not local.refs(local.project)


@pytest.mark.parametrize(
    "commit,start",
    [
        ("0" * 40, "has no commit 0000000000000000000000000000000000000000."),
        ("main", "The pinned template commit 'main' is not a full commit id."),
        ("--all", "The pinned template commit '--all' is not a full commit id."),
    ],
    ids=["missing", "branch", "option-like"],
)
def test_a_pin_the_template_cannot_honour_pushes_nothing(local, scratch, commit, start):
    """A commit the template does not hold fails with how to finish, and a
    value that is not a full commit id never reaches git. Nothing is
    pushed, and no temporary folder is left."""
    template = local.template({"README.md": "x\n"})

    error = copy_template(local, template, commit=commit)

    assert start in error.splitlines()[0]
    assert not local.refs(local.project)
    assert not list(scratch.iterdir())


@pytest.mark.parametrize(
    "stderr,detail",
    [
        ("fatal: cannot lock ref 'HEAD'\n", "fatal: cannot lock ref 'HEAD'"),
        ("", "git exited with 1."),
    ],
    ids=["git-says-why", "git-says-nothing"],
)
def test_a_pin_git_cannot_apply_pushes_nothing(local, monkeypatch, stderr, detail):
    """When git cannot move the default branch to the pinned commit, its
    words (or its exit code) are reported, and nothing is pushed."""
    template = local.template({"README.md": "x\n"})
    pinned = _commit_on_dev(template)
    real_run_git = repos.run_git

    def update_ref_fails(args, env=None):
        if "update-ref" in args:
            return subprocess.CompletedProcess(args, 1, "", stderr)
        return real_run_git(args, env)

    monkeypatch.setattr(repos, "run_git", update_ref_fails)

    error = copy_template(local, template, commit=pinned)

    assert error.splitlines() == ["Could not pin the template.", f"  {detail}"]
    assert not local.refs(local.project)


def test_a_missing_commit_says_how_to_finish(local):
    """The hint under a missing commit says what to pin instead."""
    template = local.template({"README.md": "x\n"})

    error = copy_template(local, template, commit="0" * 40)

    assert error.splitlines() == [
        f"{template} has no commit {'0' * 40}.",
        "  Pin a commit the template holds, or pin none to push its default "
        "branch.",
    ]
