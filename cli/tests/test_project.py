"""Tests for the generate_project module."""

import os
from unittest.mock import patch
import pytest
from src.pkg.project import (
    generate_project,
    generate_deploy_project,
    create_user_dirs,
    set_files_permissions,
    _copy_example_files,
    _copy_file,
    _check_no_symlinks,
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


def test_generate_project_creates_missing_dest(tmp_path):
    """generate_project creates the destination directory if it does not exist."""
    new_dir = tmp_path / "new_output"
    generate_project(str(new_dir))
    assert new_dir.is_dir()


def test_copy_file_skips_existing(tmp_path, capsys):
    """Returns None and skips when target exists and force is False."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.txt").write_text("new")
    dest = tmp_path / "dest"
    dest.mkdir()
    (dest / "a.txt").write_text("old")

    result = _copy_file(src / "a.txt", dest / "a.txt", force=False)

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


def test_copy_tree_collects_errors(tmp_path):
    """All files are attempted even when copies fail; errors are raised together."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.txt").write_text("x")
    (src / "b.txt").write_text("x")
    dest = tmp_path / "dest"
    dest.mkdir()

    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("fail")):
        with pytest.raises(OSError, match="fail"):
            _copy_tree(src, dest, force=False)


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


def test_validate_deploy_inputs_creates_missing_dest(tmp_path):
    """Missing destination directory is created instead of raising."""
    src = tmp_path / "localhost"
    src.mkdir()
    missing = tmp_path / "missing"
    _validate_deploy_inputs("localhost", src, missing)
    assert missing.is_dir()


REQUIRED_FILES = {
    "localhost": [
        "docker-compose.yml",
        "config/.env",
        "config/client.js",
    ],
    "insecure-server": [
        "docker-compose.yml",
        "config/.env",
        "config/client.js",
        "config/conf.server",
    ],
    "secure-server": [
        "docker-compose.yml",
        "config/.env",
        "config/client.js",
        "config/conf.server",
        "config/tls.yml",
    ],
    "secure-server-gitlab": [
        "docker-compose.yml",
        "config/.env",
        "config/client.js",
        "config/conf.server",
        "config/tls.yml",
    ],
    "workspace-localhost": [
        "docker-compose.yml",
        ".env",
        "config/dex-config.yaml",
    ],
    "workspace-secure-server": [
        "docker-compose.yml",
        ".env",
        "config/client.js",
        "config/forward-auth-conf",
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


def test_create_user_dirs_copies_template(tmp_path):
    """create_user_dirs copies files/template into files/<username> for each user."""
    template = tmp_path / "files" / "template"
    template.mkdir(parents=True)
    (template / "readme.txt").write_text("hello")

    create_user_dirs(str(tmp_path), ["alice", "bob"])

    assert (tmp_path / "files" / "alice" / "readme.txt").read_text() == "hello"
    assert (tmp_path / "files" / "bob" / "readme.txt").read_text() == "hello"


def test_create_user_dirs_skips_when_no_template(tmp_path):
    """create_user_dirs is a no-op when files/template does not exist."""
    create_user_dirs(str(tmp_path), ["alice"])
    assert not (tmp_path / "files" / "alice").exists()


def test_set_files_permissions_chmods_files_dir(tmp_path):
    """set_files_permissions runs sudo chmod -R on the files/ directory."""
    files_dir = tmp_path / "files"
    files_dir.mkdir(parents=True)

    with patch("src.pkg.project.subprocess.run") as mock_run:
        set_files_permissions(str(tmp_path))

    mock_run.assert_called_once_with(
        ["sudo", "chmod", "-R", "u+rwX,go+rwX", str(files_dir)],
        check=True,
    )


def test_set_files_permissions_skips_when_no_files_dir(tmp_path):
    """set_files_permissions is a no-op when files/ does not exist."""
    with patch("src.pkg.project.subprocess.run") as mock_run:
        set_files_permissions(str(tmp_path))

    mock_run.assert_not_called()


def test_create_user_dirs_skips_existing_user_dir(tmp_path):
    """create_user_dirs does not overwrite an existing user directory."""
    template = tmp_path / "files" / "template"
    template.mkdir(parents=True)
    (template / "readme.txt").write_text("new")
    user_dir = tmp_path / "files" / "alice"
    user_dir.mkdir(parents=True)
    (user_dir / "readme.txt").write_text("old")

    create_user_dirs(str(tmp_path), ["alice"])

    assert (user_dir / "readme.txt").read_text() == "old"


def test_copy_example_files_creates_actual_files(tmp_path):
    """_copy_example_files creates non-example copies of all .example files."""
    (tmp_path / "config").mkdir()
    (tmp_path / "config" / ".env.example").write_text("KEY=value")
    (tmp_path / "config" / "app.js.example").write_text("var x = 1;")

    _copy_example_files(tmp_path)

    assert (tmp_path / "config" / ".env").read_text() == "KEY=value"
    assert (tmp_path / "config" / "app.js").read_text() == "var x = 1;"


def test_copy_example_files_skips_existing_without_force(tmp_path):
    """_copy_example_files does not overwrite existing files when force=False."""
    (tmp_path / "a.example").write_text("new")
    (tmp_path / "a").write_text("old")

    _copy_example_files(tmp_path, force=False)

    assert (tmp_path / "a").read_text() == "old"


def test_copy_example_files_overwrites_with_force(tmp_path):
    """_copy_example_files overwrites existing files when force=True."""
    (tmp_path / "a.example").write_text("new")
    (tmp_path / "a").write_text("old")

    _copy_example_files(tmp_path, force=True)

    assert (tmp_path / "a").read_text() == "new"
