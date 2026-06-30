"""Tests for the generate_project module."""

import os
from unittest.mock import patch
import pytest
from src.pkg.project import (
    generate_project,
    generate_config,
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
# pylint: disable=protected-access


def test_generate_config_copies_only_toml(tmp_path):
    """generate_config writes dtaas.toml (returning False) and no other templates."""
    assert generate_config(str(tmp_path)) is False

    assert (tmp_path / "dtaas.toml").is_file()
    assert not (tmp_path / "users.server.yml").exists()


def test_generate_config_skips_existing_without_force(tmp_path, capsys):
    """An existing dtaas.toml is preserved, returns True, and prints a skip message."""
    (tmp_path / "dtaas.toml").write_text("existing")

    assert generate_config(str(tmp_path)) is True

    assert (tmp_path / "dtaas.toml").read_text() == "existing"
    assert "'dtaas.toml' already exists, skipping" in capsys.readouterr().out


def test_generate_config_raises_on_copy_failure(tmp_path):
    """OSError is raised when the dtaas.toml copy fails."""
    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("disk full")):
        with pytest.raises(OSError, match="disk full"):
            generate_config(str(tmp_path))


def test_generate_project_skips_existing_file(tmp_path, capsys):
    """An existing file is skipped and the rest are still copied."""
    (tmp_path / "dtaas.toml").write_text("existing")

    generate_project(str(tmp_path))

    assert (tmp_path / "dtaas.toml").read_text() == "existing"
    captured = capsys.readouterr()
    assert "'dtaas.toml' already exists, skipping" in captured.out


def test_generate_project_copies_resources_overlay(tmp_path):
    """generate_project ships the users.resources.yml limits overlay."""
    generate_project(str(tmp_path))

    assert (tmp_path / "users.resources.yml").is_file()


def test_generate_project_raises_on_copy_failure(tmp_path):
    """OSError is raised when a file copy fails."""
    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("disk full")):
        with pytest.raises(OSError, match="disk full"):
            generate_project(str(tmp_path))


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


def test_validate_deploy_inputs_raises_for_unknown_type(tmp_path):
    """ValueError for an unrecognised deploy type."""
    with pytest.raises(ValueError, match="Unknown deploy type"):
        _validate_deploy_inputs("bad-type", tmp_path, tmp_path)


def test_validate_deploy_inputs_raises_if_src_missing(tmp_path):
    """RuntimeError when the template directory is absent."""
    with pytest.raises(RuntimeError, match="Template directory not found"):
        _validate_deploy_inputs("localhost", tmp_path / "missing", tmp_path)


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


def test_set_files_permissions_skips_when_no_files_dir(tmp_path):
    """set_files_permissions is a no-op when files/ does not exist."""
    with patch("src.pkg.project.subprocess.run") as mock_run:
        set_files_permissions(str(tmp_path))

    mock_run.assert_not_called()


def test_copy_example_files_skips_existing_without_force(tmp_path):
    """_copy_example_files does not overwrite existing files when force=False."""
    (tmp_path / "a.example").write_text("new")
    (tmp_path / "a").write_text("old")

    _copy_example_files(tmp_path, force=False)

    assert (tmp_path / "a").read_text() == "old"


def test_generate_project_raises_when_templates_dir_missing(tmp_path):
    """generate_project raises RuntimeError when the bundled templates are absent."""
    with patch("src.pkg.project.TEMPLATES_DIR", tmp_path / "no-templates"):
        with pytest.raises(RuntimeError, match="templates directory not found"):
            generate_project(str(tmp_path / "out"))


def test_copy_example_files_raises_on_copy_failure(tmp_path):
    """A failing .example copy is collected and surfaced as an OSError."""
    (tmp_path / "a.example").write_text("x")

    with patch("src.pkg.project.shutil.copy2", side_effect=OSError("disk full")):
        with pytest.raises(OSError, match="disk full"):
            _copy_example_files(tmp_path)


def test_set_files_permissions_chowns_and_chmods_files_dir(tmp_path):
    """set_files_permissions sets ownership to 1000:100 then grants rwX on files/."""
    files_dir = tmp_path / "files"
    files_dir.mkdir()

    with patch("src.pkg.project.subprocess.run") as mock_run:
        set_files_permissions(str(tmp_path))

    commands = [call.args[0] for call in mock_run.call_args_list]
    assert commands == [
        ["sudo", "chown", "-R", "1000:100", str(files_dir)],
        ["sudo", "chmod", "-R", "u+rwX,go+rwX", str(files_dir)],
    ]


def test_set_files_permissions_ignores_missing_sudo(tmp_path):
    """set_files_permissions swallows FileNotFoundError when sudo is unavailable."""
    (tmp_path / "files").mkdir()

    with patch(
        "src.pkg.project.subprocess.run", side_effect=FileNotFoundError("no sudo")
    ):
        set_files_permissions(str(tmp_path))  # must not raise


def test_generate_deploy_project_warns_when_no_templates(tmp_path, capsys):
    """generate_deploy_project warns and returns early when no templates exist."""
    with patch("src.pkg.project._validate_deploy_inputs"), patch(
        "src.pkg.project._has_template_files", return_value=False
    ), patch("src.pkg.project._copy_tree") as mock_copy:
        generate_deploy_project("localhost", str(tmp_path))

    assert "no deployment templates found" in capsys.readouterr().out
    mock_copy.assert_not_called()
