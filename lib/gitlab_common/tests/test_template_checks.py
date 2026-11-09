"""Tests for template_checks.py: a real bare clone of a local template, so
git itself answers what is at HEAD."""

import subprocess
from unittest.mock import patch

import pytest
from gitlab_common.template_checks import NO_COMMITS, template_problem
from tests.conftest import fixture_git

LFS_POINTER = (
    "version https://git-lfs.github.com/spec/v1\n"
    "oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393\n"
    "size 12345\n"
)
# pylint: disable=redefined-outer-name


@pytest.fixture
def cloned(tmp_path, make_template):
    """Bare clone a template made of *files*, as cloned_template does."""

    def clone(files):
        repo = tmp_path / "clone.git"
        fixture_git("clone", "-q", "--bare", make_template(files), repo)
        return str(repo)

    return clone


def test_a_template_with_lfs_pointers_is_refused(cloned):
    """Pushing pointers would give users stubs instead of their files, so
    the template is refused and the pointer files are named."""
    problem = template_problem(
        cloned({"model fmu.fmu": LFS_POINTER, "README.md": "x\n"})
    )
    assert problem.splitlines() == [
        "The template uses Git LFS, which is not supported.",
        "  LFS pointer files: model fmu.fmu",
    ]


@pytest.mark.parametrize(
    "files",
    [
        {"docs/lfs.md": "# LFS\nversion https://git-lfs.github.com/spec/v1\n"},
        {"docs/lfs.md": LFS_POINTER + "x" * 1024 + "\n"},
        {
            ".gitattributes": "*.jar filter=lfs diff=lfs merge=lfs -text\n",
            "tool.jar": "a plain file, not a pointer\n",
        },
    ],
    ids=["quotes-version-line", "too-large-to-be-a-pointer", "gitattributes-only"],
)
def test_a_template_without_pointers_is_pushable(cloned, files):
    """Only a file shaped like a pointer counts: a document quoting the
    pointer lines does not, and neither does a .gitattributes that names
    LFS for files stored whole (as the default user1 template does)."""
    assert template_problem(cloned(files)) == ""


def test_a_template_without_commits_says_so(cloned):
    """An empty template has no default branch to push."""
    assert template_problem(cloned({})) == NO_COMMITS


HAS_HEAD = subprocess.CompletedProcess([], 0, "", "")
POINTER_FOUND = subprocess.CompletedProcess([], 0, "HEAD:a.fmu\0", "")
GIT_FAILS = subprocess.CompletedProcess([], 128, "", "fatal: bad object HEAD")


@pytest.mark.parametrize(
    "results",
    [[HAS_HEAD, GIT_FAILS], [HAS_HEAD, POINTER_FOUND, GIT_FAILS]],
    ids=["grep-fails", "ls-tree-fails"],
)
def test_a_git_error_is_reported(results):
    """A git failure while reading HEAD is reported with git's words."""
    with patch("gitlab_common.template_checks.run_git", side_effect=results):
        problem = template_problem("repo.git")
    assert problem.splitlines() == [
        "Could not read the template's default branch.",
        "  fatal: bad object HEAD",
    ]
