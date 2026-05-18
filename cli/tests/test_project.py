"""Tests for the generate_project module."""

from unittest.mock import patch
import pytest
from src.pkg.project import generate_project, _copy_template, TEMPLATE_FILES


def test_generate_project_creates_all_files(tmp_path):
    """All three template files and workspace dirs are created."""
    generate_project(str(tmp_path))

    for name in TEMPLATE_FILES:
        assert (tmp_path / name).exists()
    assert (tmp_path / "files" / "template").exists()


def test_generate_project_skips_existing_file(tmp_path, capsys):
    """An existing file is skipped and the rest are still copied."""
    (tmp_path / "dtaas.toml").write_text("existing")

    generate_project(str(tmp_path))

    assert (tmp_path / "dtaas.toml").read_text() == "existing"
    captured = capsys.readouterr()
    assert "'dtaas.toml' already exists, skipping" in captured.out


def test_generate_project_raises_on_copy_failure(tmp_path):
    """OSError is raised when a file copy fails."""
    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("disk full")):
        with pytest.raises(OSError, match="disk full"):
            generate_project(str(tmp_path))


def test_generate_project_collects_all_copy_failures(tmp_path):
    """All template files are attempted even when copies fail; errors are combined."""
    call_count = {"n": 0}

    def always_fail(*_args, **_kwargs):
        call_count["n"] += 1
        raise OSError("fail")

    with patch("src.pkg.project.shutil.copy2", side_effect=always_fail):
        with pytest.raises(OSError):
            generate_project(str(tmp_path))

    assert call_count["n"] == len(TEMPLATE_FILES)


def test_generate_project_raises_if_dest_not_found():
    """FileNotFoundError is raised immediately when dest_dir does not exist."""
    with pytest.raises(FileNotFoundError, match="does not exist"):
        generate_project("/nonexistent/path/that/cannot/exist")


@pytest.mark.parametrize("template_name", TEMPLATE_FILES)
def test_copy_template_creates_file(tmp_path, template_name):
    """Each template file is copied when the destination does not exist."""
    _copy_template(template_name, str(tmp_path))

    assert (tmp_path / template_name).exists()


def test_copy_template_skips_existing_file(tmp_path):
    """Copying to an existing destination returns True and leaves the file unchanged."""
    (tmp_path / "dtaas.toml").write_text("keep me")

    skipped = _copy_template("dtaas.toml", str(tmp_path))

    assert (tmp_path / "dtaas.toml").read_text() == "keep me"
    assert skipped is True


def test_copy_template_force_overwrites_existing_file(tmp_path):
    """force=True overwrites an existing file."""
    (tmp_path / "dtaas.toml").write_text("old content")

    _copy_template("dtaas.toml", str(tmp_path), force=True)

    assert (tmp_path / "dtaas.toml").read_text() != "old content"


def test_copy_template_raises_on_failure(tmp_path):
    """OSError propagates on copy failure."""
    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("no space")):
        with pytest.raises(OSError, match="no space"):
            _copy_template("dtaas.toml", str(tmp_path))


def test_generate_project_creates_workspace_dirs(tmp_path):
    """The files/template directory structure is created."""
    generate_project(str(tmp_path))

    assert (tmp_path / "files" / "template").is_dir()


def test_generate_project_force_overwrites_existing_files(tmp_path):
    """force=True causes existing files to be replaced."""
    for name in TEMPLATE_FILES:
        (tmp_path / name).write_text("old content")

    generate_project(str(tmp_path), force=True)

    for name in TEMPLATE_FILES:
        assert (tmp_path / name).read_text() != "old content"


def test_generate_project_workspace_dir_already_exists(tmp_path):
    """No error if files/template directory already exists."""
    (tmp_path / "files" / "template").mkdir(parents=True, exist_ok=True)

    generate_project(str(tmp_path))


def test_generate_project_raises_on_mkdir_failure(tmp_path):
    """OSError is raised when mkdir fails."""
    with patch("src.pkg.project.Path.mkdir", side_effect=OSError("permission denied")):
        with pytest.raises(OSError, match="permission denied"):
            generate_project(str(tmp_path))
