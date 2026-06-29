"""Tests for src/pkg/build.py."""

import shutil
import stat
from pathlib import Path

import pytest
from src.pkg.build import build, main, _copy_one, _SOURCES, _DEST_ROOT, _EXCLUDE


def _force_remove(func, path, _excinfo):
    """rmtree onerror handler: clear the read-only bit, then retry deletion."""
    Path(path).chmod(stat.S_IWRITE)
    func(path)


@pytest.fixture(autouse=True, scope="session")
def built_templates():
    """Run build() once per session, wiping any stale output directory first."""
    if _DEST_ROOT.exists():
        shutil.rmtree(_DEST_ROOT, onerror=_force_remove)  # pylint: disable=deprecated-argument
    build()


def test_build_creates_all_deploy_type_dirs():
    """build() produces a directory for every deploy type."""
    for deploy_type in _SOURCES:
        dest = _DEST_ROOT / deploy_type
        assert dest.is_dir(), f"Missing template directory for type '{deploy_type}'"


def test_build_each_dir_is_non_empty():
    """Every generated deploy directory contains at least one file."""
    for deploy_type in _SOURCES:
        files = list((_DEST_ROOT / deploy_type).rglob("*"))
        assert any(
            f.is_file() for f in files
        ), f"No files found in template directory for type '{deploy_type}'"


def test_build_excludes_companion_from_workspace_localhost():
    """companion/ must not appear in the workspace-localhost template."""
    companion = _DEST_ROOT / "workspace-localhost" / "companion"
    assert (
        not companion.exists()
    ), "companion/ should be excluded from workspace-localhost"


def test_build_excludes_are_complete():
    """No excluded directory name appears at the top level of any generated template."""
    for deploy_type in _SOURCES:
        dest = _DEST_ROOT / deploy_type
        for excluded in _EXCLUDE:
            assert not (
                dest / excluded
            ).exists(), (
                f"Excluded directory '{excluded}' found in '{deploy_type}' template"
            )


def test_copy_one_raises_when_source_missing():
    """_copy_one raises FileNotFoundError when the source directory does not exist."""
    with pytest.raises(FileNotFoundError, match="Source not found"):
        _copy_one("localhost", "nonexistent/path/that/cannot/exist")


def test_copy_one_overwrites_existing_dest():
    """_copy_one removes and recreates the destination when it already exists."""
    deploy_type = next(iter(_SOURCES))
    dest = _DEST_ROOT / deploy_type
    assert dest.exists(), "fixture must have created the dest dir first"
    _copy_one(deploy_type, _SOURCES[deploy_type])
    assert dest.is_dir()


def test_main_returns_zero(capsys):
    """main() prints a summary line and returns 0."""
    result = main()
    assert result == 0
    assert str(len(_SOURCES)) in capsys.readouterr().out
