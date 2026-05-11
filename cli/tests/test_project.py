"""Tests for the generate_project module."""

from unittest.mock import patch
import pytest
from src.pkg.project import generate_project, _copy_template, TEMPLATE_FILES


def test_generate_project_creates_all_files(tmp_path):
    """All three template files and workspace dirs are created."""
    err = generate_project(str(tmp_path))

    assert err is None
    for name in TEMPLATE_FILES:
        assert (tmp_path / name).exists()
    assert (tmp_path / "files" / "template").exists()


def test_generate_project_skips_existing_file(tmp_path, capsys):
    """An existing file is skipped and the rest are still copied."""
    (tmp_path / "dtaas.toml").write_text("existing")

    err = generate_project(str(tmp_path))

    assert err is None
    assert (tmp_path / "dtaas.toml").read_text() == "existing"
    captured = capsys.readouterr()
    assert "'dtaas.toml' already exists, skipping" in captured.out


def test_generate_project_returns_error_on_copy_failure(tmp_path):
    """An Exception is returned when a file copy fails."""
    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("disk full")):
        err = generate_project(str(tmp_path))

    assert err is not None
    assert "dtaas.toml" in str(err)


def test_generate_project_stops_on_first_failure(tmp_path):
    """Only one error is returned; remaining files are not attempted."""
    call_count = {"n": 0}

    def fail_on_first(*_args, **_kwargs):
        call_count["n"] += 1
        raise OSError("fail")

    with patch("src.pkg.project.shutil.copy2", side_effect=fail_on_first):
        err = generate_project(str(tmp_path))

    assert err is not None
    assert call_count["n"] == 1


@pytest.mark.parametrize("template_name", TEMPLATE_FILES)
def test_copy_template_creates_file(tmp_path, template_name):
    """Each template file is copied when the destination does not exist."""
    err = _copy_template(template_name, str(tmp_path))

    assert err is None
    assert (tmp_path / template_name).exists()


def test_copy_template_skips_existing_file(tmp_path, capsys):
    """Copying to an existing destination skips without error."""
    (tmp_path / "dtaas.toml").write_text("keep me")

    err = _copy_template("dtaas.toml", str(tmp_path))

    assert err is None
    assert (tmp_path / "dtaas.toml").read_text() == "keep me"
    assert "already exists" in capsys.readouterr().out


def test_copy_template_returns_error_on_failure(tmp_path):
    """An Exception carrying the file name is returned on copy failure."""
    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("no space")):
        err = _copy_template("dtaas.toml", str(tmp_path))

    assert err is not None
    assert "dtaas.toml" in str(err)


def test_generate_project_creates_workspace_dirs(tmp_path):
    """The files/template directory structure is created."""
    err = generate_project(str(tmp_path))

    assert err is None
    assert (tmp_path / "files" / "template").is_dir()


def test_generate_project_workspace_dir_already_exists(tmp_path):
    """No error if files/template directory already exists."""
    (tmp_path / "files" / "template").mkdir(parents=True, exist_ok=True)

    err = generate_project(str(tmp_path))

    assert err is None


def test_generate_project_returns_error_on_mkdir_failure(tmp_path):
    """An Exception is returned when mkdir fails."""
    with patch("src.pkg.project.Path.mkdir", side_effect=OSError("permission denied")):
        err = generate_project(str(tmp_path))

    assert err is not None
    assert "workspace directories" in str(err)
