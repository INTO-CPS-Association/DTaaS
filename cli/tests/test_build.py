"""Tests for src/pkg/build.py."""

import shutil
import stat
from pathlib import Path

import pytest
from src.pkg.build import (
    build,
    main,
    vendor_gitlab_common,
    _copy_one,
    _ignore,
    _SOURCES,
    _DEST_ROOT,
    _GITLAB_COMMON_DEST,
)
from src.pkg.constants import SECRET_FILENAMES, SECRET_SUFFIXES


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


@pytest.mark.parametrize(
    "deploy_type", ["workspace-localhost", "workspace-secure-server"]
)
def test_build_places_workspace_env_under_config(deploy_type):
    """#1719 moved the workspace .env template into config/; build copies it there."""
    dest = _DEST_ROOT / deploy_type
    assert (
        dest / "config" / ".env.example"
    ).is_file(), f"config/.env.example missing from '{deploy_type}' template"
    assert not (
        dest / ".env.example"
    ).exists(), f"stale root .env.example present in '{deploy_type}' template"


def test_ignore_excludes_locally_populated_secret_files():
    """_ignore drops gitignored secret filenames a dev machine may have populated.

    These names are never committed to git (see .gitignore) but shutil.copytree
    cannot know that -- a locally-configured .env or TLS key sitting in a
    _SOURCES directory must not reach the packaged wheel.
    """
    names = [
        ".env",
        "conf.server",
        "client.js",
        "forward-auth-conf",
        "privkey.pem",
        "server.key",
        "server.crt",
        "client.p12",
    ]
    assert set(_ignore("config", names)) == set(names)


def test_ignore_keeps_example_and_unrelated_files():
    """_ignore only matches exact secret filenames/suffixes, not their .example
    counterparts or unrelated tracked files."""
    names = [".env.example", "client.js.example", "conf.server.example", "tls.yml"]
    assert _ignore("config", names) == []


def test_build_never_copies_excluded_secret_filenames():
    """No file matching the secret-exclusion rules appears anywhere under the
    real, built template tree."""
    for path in _DEST_ROOT.rglob("*"):
        if path.is_file():
            assert path.name not in SECRET_FILENAMES, f"Excluded file leaked: {path}"
            assert not path.name.endswith(
                SECRET_SUFFIXES
            ), f"Excluded file leaked: {path}"


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


def test_build_vendors_gitlab_common():
    """build() also vendors gitlab_common from lib/gitlab_common."""
    assert _GITLAB_COMMON_DEST.is_dir()
    assert (_GITLAB_COMMON_DEST / "__init__.py").is_file()
    assert (_GITLAB_COMMON_DEST / "client.py").is_file()
    assert (_GITLAB_COMMON_DEST / "users.py").is_file()
    assert (_GITLAB_COMMON_DEST / "validators.py").is_file()


def test_vendor_gitlab_common_raises_when_source_missing(monkeypatch):
    """vendor_gitlab_common raises FileNotFoundError when lib/gitlab_common is absent."""
    monkeypatch.setattr(
        "src.pkg.build._GITLAB_COMMON_SOURCE",
        _DEST_ROOT / "nonexistent-gitlab-common-source",
    )
    with pytest.raises(FileNotFoundError, match="Source not found"):
        vendor_gitlab_common()


def test_vendor_gitlab_common_overwrites_existing_dest():
    """vendor_gitlab_common removes and recreates an existing destination."""
    assert _GITLAB_COMMON_DEST.exists(), "fixture must have vendored it first"
    vendor_gitlab_common()
    assert _GITLAB_COMMON_DEST.is_dir()


def test_vendor_gitlab_common_stamps_source_version():
    """Each vendored copy records the git commit it was copied from, so a
    divergence between an installed wheel and lib/gitlab_common is traceable."""
    vendor_gitlab_common()
    init_contents = (_GITLAB_COMMON_DEST / "__init__.py").read_text(encoding="utf-8")
    assert "__source_version__ = " in init_contents
