"""Tests for cloned_template and TemplateClone.push: a real git clone and
push between local repositories, so no network is needed."""

from gitlab_common.repos import cloned_template
from tests.test_repos.conftest import USER_TOKEN


def _copy(local, template, path="alice/common"):
    """Clone *template*, then push it to the local project *path*."""
    with cloned_template(local.access, str(template)) as clone:
        return clone.error or clone.push(path, USER_TOKEN)


def test_copy_pushes_the_default_branch_and_leaves_no_temp_files(local, scratch):
    """The project gets the template's default branch with its history, and
    nothing else: the temporary clone is gone afterwards."""
    template = local.template({"README.md": "common\n"})

    assert _copy(local, template) == ""
    assert local.refs(local.project) == {"refs/heads/main": local.head(template)}
    assert not list(scratch.iterdir())


def test_the_push_asks_for_no_ci_pipeline(local, tmp_path):
    """The push carries the push option ci.skip, which GitLab reads to start
    no pipeline, so nothing runs with the admin's identity."""
    seen = tmp_path / "push-options.txt"
    hook = local.project / "hooks" / "pre-receive"
    hook.write_text(
        "#!/bin/sh\ncat > /dev/null\n"
        f'echo "$GIT_PUSH_OPTION_COUNT $GIT_PUSH_OPTION_0" > "{seen.as_posix()}"\n',
        encoding="utf-8",
        newline="\n",
    )
    hook.chmod(0o755)

    assert _copy(local, local.template({"README.md": "x\n"})) == ""
    assert seen.read_text(encoding="utf-8").strip() == "1 ci.skip"


def test_a_template_its_checks_refuse_is_never_pushed(local, scratch):
    """The checks of template_checks.py run on the clone: a refused template
    is the clone's error, and nothing reaches the project."""
    error = _copy(local, local.template({}))

    assert error == "The template has no commits."
    assert not local.refs(local.project)
    assert not list(scratch.iterdir())


def test_copy_reports_a_template_that_cannot_be_cloned(local, scratch, tmp_path):
    """A clone failure names the template and keeps git's reason."""
    missing = tmp_path / "no-such-template"

    error = _copy(local, missing)

    assert error.startswith(f"Could not clone {missing}.")
    assert len(error.splitlines()) > 2
    assert error.endswith(
        "Templates are cloned without a login, so they must be public."
    )
    assert not local.refs(local.project)
    assert not list(scratch.iterdir())


def test_copy_reports_a_push_failure(local, scratch):
    """A push failure names the project URL, never the user's token."""
    error = _copy(local, local.template({"README.md": "x\n"}), "alice/missing")

    assert error.startswith("Could not push to ")
    assert "alice/missing.git" in error
    assert USER_TOKEN not in error
    assert not list(scratch.iterdir())
