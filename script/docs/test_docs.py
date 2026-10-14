"""Tests for the documentation command line."""

import pytest

import docs


@pytest.fixture(name="commands")
def fixture_commands(monkeypatch) -> list[tuple[tuple[str, ...], dict | None]]:
    """Record the commands docs.py runs instead of running them."""
    recorded = []
    monkeypatch.setattr(docs.shutil, "which", lambda _: "/usr/bin/git-lfs")
    monkeypatch.setattr(
        docs, "run", lambda *command, env=None: recorded.append((command, env))
    )
    return recorded


def test_version_prints_site_directory(capsys):
    """version prints the site directory for a tag."""
    assert docs.main(["version", "v1.0"]) == 0
    assert capsys.readouterr().out.strip() == "version1.0"


def test_version_reports_bad_tag(capsys):
    """version reports a tag that is not a release tag."""
    assert docs.main(["version", "latest"]) == 1
    assert "not a release tag" in capsys.readouterr().err


def test_build_fetches_lfs_media_then_builds_html(commands, tmp_path):
    """build fetches LFS media, then builds HTML with mkdocs-github.yml."""
    assert docs.main(["build", "--site-dir", str(tmp_path)]) == 0
    assert commands[1][0] == ("git", "lfs", "pull", "--include=docs/**")
    mkdocs_command, env = commands[-1]
    assert mkdocs_command[-2:] == ("--config-file", docs.HTML_CONFIG)
    assert env["MKDOCS_ENABLE_PDF_EXPORT"] == "0"


def test_build_pdf_uses_pdf_config_on_linux(commands, monkeypatch, tmp_path):
    """build --pdf uses mkdocs.yml with PDF export on Linux."""
    monkeypatch.setattr(docs.platform, "system", lambda: "Linux")
    assert docs.main(["build", "--pdf", "--site-dir", str(tmp_path)]) == 0
    mkdocs_command, env = commands[-1]
    assert mkdocs_command[-2:] == ("--config-file", docs.PDF_CONFIG)
    assert env["MKDOCS_ENABLE_PDF_EXPORT"] == "1"


def test_build_pdf_refused_off_linux(commands, monkeypatch, capsys):
    """build --pdf is refused off Linux before running anything."""
    monkeypatch.setattr(docs.platform, "system", lambda: "Windows")
    assert docs.main(["build", "--pdf"]) == 1
    assert "only on Linux" in capsys.readouterr().err
    assert not commands


def test_build_needs_git_lfs(monkeypatch, capsys):
    """build reports a missing git-lfs."""
    monkeypatch.setattr(docs.shutil, "which", lambda _: None)
    assert docs.main(["build"]) == 1
    assert "git-lfs is not installed" in capsys.readouterr().err


def test_assemble_refuses_folders_outside_the_repository(tmp_path, capsys):
    arguments = ["assemble", "--version", "development"]
    paths = ["--site-dir", str(tmp_path / "site"), "--pages-dir", str(tmp_path)]
    assert docs.main(arguments + paths) == 1
    assert "outside" in capsys.readouterr().err
