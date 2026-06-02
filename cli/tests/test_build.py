"""Tests for src/pkg/build.py."""

import pytest
from src.pkg.build import build, _copy_one, _SOURCES, _DEST_ROOT, _EXCLUDE


def test_build_creates_all_deploy_type_dirs():
    """build() produces a directory for every deploy type."""
    build()

    for deploy_type in _SOURCES:
        dest = _DEST_ROOT / deploy_type
        assert dest.is_dir(), f"Missing template directory for type '{deploy_type}'"


def test_build_each_dir_is_non_empty():
    """Every generated deploy directory contains at least one file."""
    build()

    for deploy_type in _SOURCES:
        files = list((_DEST_ROOT / deploy_type).rglob("*"))
        assert any(
            f.is_file() for f in files
        ), f"No files found in template directory for type '{deploy_type}'"


def test_build_excludes_companion_from_workspace_localhost():
    """companion/ must not appear in the workspace-localhost template."""
    build()

    companion = _DEST_ROOT / "workspace-localhost" / "companion"
    assert (
        not companion.exists()
    ), "companion/ should be excluded from workspace-localhost"


def test_build_excludes_are_complete():
    """No excluded directory name appears at the top level of any generated template."""
    build()

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
