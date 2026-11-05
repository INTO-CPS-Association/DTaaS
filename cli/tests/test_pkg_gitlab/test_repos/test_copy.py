"""Tests for copy_template: a real git clone and push between local
repositories, so no network is needed."""

from src.pkg.gitlab.repos import TemplateCopy, copy_template

LFS_POINTER = (
    "version https://git-lfs.github.com/spec/v1\n"
    "oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393\n"
    "size 12345\n"
)


def _copy(local, template, path="alice/common"):
    """copy_template from *template* to the local project *path*."""
    return copy_template(local.access, TemplateCopy(str(template), path))


def test_copy_pushes_the_default_branch_and_leaves_no_temp_files(local, scratch):
    """The project gets the template's default branch with its history, and
    nothing else; the temporary clone is gone afterwards."""
    template = local.template({"README.md": "common\n"})

    assert _copy(local, template) == ""
    assert local.refs(local.project) == {"refs/heads/main": local.head(template)}
    assert not list(scratch.iterdir())


def test_copy_refuses_a_template_holding_lfs_pointers(local, scratch):
    """Pushing LFS pointers would give users stubs instead of their files,
    so the project is left empty and the files are named."""
    template = local.template({"model.fmu": LFS_POINTER, "README.md": "x\n"})

    error = _copy(local, template)

    assert "Git LFS, which is not supported" in error
    assert "model.fmu" in error
    assert "README.md" not in error
    assert not local.refs(local.project)
    assert not list(scratch.iterdir())


def test_copy_reports_a_template_without_commits(local, scratch):
    """An empty template has no default branch to push: the project is left
    as it is, and the message says why."""
    error = _copy(local, local.template({}))

    assert error.startswith("Could not read the template's default branch.")
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
    """A push failure names the project URL, never the token."""
    error = _copy(local, local.template({"README.md": "x\n"}), "alice/missing")

    assert error.startswith("Could not push to ")
    assert "alice/missing.git" in error
    assert local.access.token not in error
    assert not list(scratch.iterdir())
