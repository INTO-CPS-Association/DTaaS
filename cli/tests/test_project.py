"""Tests for the generate_project module."""

from unittest.mock import patch
import pytest
from src.pkg.project import (
    generate_project,
    generate_deploy_project,
    _copy_template,
    _copy_file,
    _copy_tree,
    _validate_deploy_inputs,
    TEMPLATE_FILES,
    DEPLOY_TYPES,
)


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


def test_generate_project_raises_if_dest_not_found():
    """FileNotFoundError is raised immediately when dest_dir does not exist."""
    with pytest.raises(FileNotFoundError, match="does not exist"):
        generate_project("/nonexistent/path/that/cannot/exist")


def test_copy_file_skips_existing(tmp_path, capsys):
    """Returns None and skips when target exists and force is False."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.txt").write_text("new")
    dest = tmp_path / "dest"
    dest.mkdir()
    (dest / "a.txt").write_text("old")

    result = _copy_file(src / "a.txt", src, dest, force=False)

    assert result is None
    assert (dest / "a.txt").read_text() == "old"
    assert "already exists, skipping" in capsys.readouterr().out


def test_copy_tree_collects_errors(tmp_path):
    """All files are attempted even when copies fail."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.txt").write_text("a")
    (src / "b.txt").write_text("b")

    dest = tmp_path / "dest"
    dest.mkdir()

    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("fail")):
        with pytest.raises(OSError, match="fail"):
            _copy_tree(src, dest)


def test_validate_deploy_inputs_raises_for_unknown_type(tmp_path):
    """ValueError for an unrecognised deploy type."""
    with pytest.raises(ValueError, match="Unknown deploy type"):
        _validate_deploy_inputs("bad-type", tmp_path, tmp_path)


def test_validate_deploy_inputs_raises_if_src_missing(tmp_path):
    """RuntimeError when the template directory is absent."""
    with pytest.raises(RuntimeError, match="Template directory not found"):
        _validate_deploy_inputs("localhost", tmp_path / "missing", tmp_path)


def test_validate_deploy_inputs_raises_if_dest_missing(tmp_path):
    """FileNotFoundError when the destination directory is absent."""
    src = tmp_path / "localhost"
    src.mkdir()
    with pytest.raises(FileNotFoundError, match="does not exist"):
        _validate_deploy_inputs("localhost", src, tmp_path / "missing")


@pytest.mark.parametrize("deploy_type", sorted(DEPLOY_TYPES))
def test_generate_deploy_project_copies_files(tmp_path, deploy_type):
    """Each deploy type produces at least one file."""
    generate_deploy_project(deploy_type, str(tmp_path))

    copied = list(tmp_path.rglob("*"))
    files = [p for p in copied if p.is_file()]
    assert len(files) > 0, f"No files generated for type '{deploy_type}'"

