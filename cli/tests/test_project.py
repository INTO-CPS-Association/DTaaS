"""Tests for the generate_project module."""

import os
from unittest.mock import patch
import pytest
from src.pkg.project import (
    generate_project,
    generate_deploy_project,
    _copy_file,
    _check_no_symlinks,
    _copy_entries,
    _copy_tree,
    _validate_deploy_inputs,
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


def test_check_no_symlinks_raises_on_symlink(tmp_path):
    """OSError is raised when any entry in the list is a symlink."""
    src = tmp_path / "src"
    src.mkdir()
    real = src / "real.txt"
    real.write_text("content")
    link = src / "link.txt"
    try:
        link.symlink_to(real)
    except OSError:
        pytest.skip("symlink creation not supported in this environment")

    with pytest.raises(OSError, match="symlinks"):
        _check_no_symlinks(src, [real, link])


def test_check_no_symlinks_passes_for_regular_files(tmp_path):
    """No exception is raised when all entries are regular files."""
    src = tmp_path / "src"
    src.mkdir()
    entries = [src / "a.txt", src / "b.txt"]
    for e in entries:
        e.write_text("x")

    _check_no_symlinks(src, entries)  # must not raise


def test_copy_entries_collects_errors(tmp_path):
    """All files are attempted even when copies fail; errors are raised together."""
    src = tmp_path / "src"
    src.mkdir()
    entries = [src / "a.txt", src / "b.txt"]
    for e in entries:
        e.write_text("x")
    dest = tmp_path / "dest"
    dest.mkdir()

    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("fail")):
        with pytest.raises(OSError, match="fail"):
            _copy_entries(entries, src, dest, force=False)


def test_copy_tree_delegates_to_helpers(tmp_path):
    """_copy_tree successfully copies a plain directory tree end-to-end."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.txt").write_text("a")
    (src / "sub").mkdir()
    (src / "sub" / "b.txt").write_text("b")
    dest = tmp_path / "dest"
    dest.mkdir()

    _copy_tree(src, dest)

    assert (dest / "a.txt").read_text() == "a"
    assert (dest / "sub" / "b.txt").read_text() == "b"


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


REQUIRED_FILES = {
    "localhost": [
        "docker-compose.yml",
        "config/.env.example",
        "config/client.js.example",
    ],
    "insecure-server": [
        "docker-compose.yml",
        "config/.env.example",
        "config/client.js.example",
        "config/conf.server.example",
    ],
    "secure-server": [
        "docker-compose.yml",
        "config/.env.example",
        "config/client.js.example",
        "config/conf.server.example",
        "config/tls.yml",
    ],
    "secure-server-gitlab": [
        "docker-compose.yml",
        "config/.env.example",
        "config/client.js.example",
        "config/conf.server.example",
        "config/tls.yml",
    ],
    "workspace-localhost": [
        "docker-compose.yml",
        ".env.example",
        "config/dex-config.yaml.example",
    ],
    "workspace-secure-server": [
        "docker-compose.yml",
        ".env.example",
        "config/forward-auth-conf.example",
        "config/tls.yml",
    ],
}


@pytest.mark.skipif(
    os.getenv("GITHUB_ACTIONS") == "true",
    reason="Template directories not available in CI",
)
@pytest.mark.parametrize("deploy_type", sorted(DEPLOY_TYPES))
def test_generate_deploy_project_copies_required_files(tmp_path, deploy_type):
    """Each deploy type copies its minimal set of critical files."""
    generate_deploy_project(deploy_type, str(tmp_path))

    for rel in REQUIRED_FILES[deploy_type]:
        assert (
            tmp_path / rel
        ).is_file(), f"[{deploy_type}] required file missing after generation: {rel}"
