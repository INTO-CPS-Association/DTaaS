"""Tests for assembling the published documentation site."""

from datetime import date
from pathlib import Path

import pytest

import pages

LFS_POINTER = b"version https://git-lfs.github.com/spec/v1\noid sha256:00\n"


def write(path: Path, content: str | bytes = "x") -> Path:
    """Write a file, creating its parent directories."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content, "utf-8")
    return path


@pytest.fixture(name="docs_dir")
def fixture_docs_dir(tmp_path: Path) -> Path:
    """A docs/ directory whose landing page lists version1.0."""
    docs = tmp_path / "docs"
    write(docs / "redirect-page.html", '<a href="version1.0/index.html">')
    for asset in pages.LANDING_ASSETS:
        write(docs / asset, "x")
    return docs


@pytest.fixture(name="site_dir")
def fixture_site_dir(tmp_path: Path) -> Path:
    """A built MkDocs site with a PDF."""
    site = tmp_path / "site"
    write(site / "index.html", "new")
    write(site / "img.png", b"\x89PNG")
    write(site / pages.BUILT_PDF, b"%PDF")
    return site


@pytest.mark.parametrize(
    "tag, expected",
    [(None, "development"), ("v1.0", "version1.0"), ("v0.8.0", "version0.8")],
)
def test_version_name(tag, expected):
    """Release tags map to versionX.Y; no tag means development."""
    assert pages.version_name(tag) == expected


@pytest.mark.parametrize("tag", ["1.0", "v1", "new-workspace-release-v1.0-beta"])
def test_version_name_rejects_other_tags(tag):
    """Tags that are not vX.Y[.Z] are refused."""
    with pytest.raises(pages.PublishError):
        pages.version_name(tag)


def test_assemble_replaces_version(tmp_path, site_dir, docs_dir):
    """The version directory is replaced and its PDF moved to the root."""
    pages_dir = tmp_path / "pages"
    write(pages_dir / "development" / "stale.html")
    pages.assemble(site_dir, pages_dir, "development", docs_dir)
    assert (pages_dir / "development" / "index.html").read_text("utf-8") == "new"
    assert not (pages_dir / "development" / "stale.html").exists()
    assert not (pages_dir / "development" / "pdf").exists()
    assert (pages_dir / "DTaaS-development.pdf").read_bytes() == b"%PDF"
    assert (pages_dir / "index.html").is_file()
    for asset in pages.LANDING_ASSETS:
        assert (pages_dir / asset).is_file()


def test_assemble_writes_the_current_year(tmp_path, site_dir, docs_dir):
    """Assemble writes the current year."""
    write(docs_dir / "redirect-page.html", "&copy; 2022 - {{ year }}")
    pages_dir = tmp_path / "pages"
    pages.assemble(site_dir, pages_dir, pages.DEVELOPMENT, docs_dir)
    landing = (pages_dir / "index.html").read_text("utf-8")
    assert landing == f"&copy; 2022 - {date.today().year}"


def test_assemble_removes_polyfill_from_old_versions(tmp_path, site_dir, docs_dir):
    """Assemble removes polyfill from old versions."""
    pages_dir = tmp_path / "pages"
    old_page = write(
        pages_dir / "version0.3" / "index.html",
        "<head>\n"
        '        <script src="https://polyfill.io/v3/polyfill.min.js?features=es6">'
        "</script>\n"
        '        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/x.js"></script>\n'
        "</head>\n",
    )
    pages.assemble(site_dir, pages_dir, pages.DEVELOPMENT, docs_dir)
    html = old_page.read_text("utf-8")
    assert "polyfill.io" not in html
    assert "cdn.jsdelivr.net" in html


def test_remove_polyfill_leaves_files_outside_the_site(tmp_path):
    """Remove polyfill leaves files outside the site."""
    tag = '<script src="https://polyfill.io/v3/polyfill.min.js"></script>\n'
    outside = write(tmp_path / "outside.html", tag)
    site = tmp_path / "pages"
    site.mkdir()
    (site / "link.html").symlink_to(outside)
    assert pages.remove_polyfill(site) == 0
    assert outside.read_text("utf-8") == tag


def test_assemble_keeps_other_versions(tmp_path, site_dir, docs_dir):
    """Publishing one version leaves the others untouched."""
    pages_dir = tmp_path / "pages"
    kept = write(pages_dir / "version0.8" / "index.html", "old")
    pages.assemble(site_dir, pages_dir, "version1.0", docs_dir)
    assert kept.read_text("utf-8") == "old"
    assert (pages_dir / "version1.0" / "index.html").is_file()


def test_assemble_requires_release_row(tmp_path, site_dir, docs_dir):
    """A release missing from the landing page is refused."""
    with pytest.raises(pages.PublishError, match="no row for version2.0"):
        pages.assemble(site_dir, tmp_path / "pages", "version2.0", docs_dir)


def test_assemble_rejects_lfs_attributes(tmp_path, site_dir, docs_dir):
    """A site whose .gitattributes uses Git LFS is refused."""
    pages_dir = tmp_path / "pages"
    write(pages_dir / ".gitattributes", "*.png filter=lfs diff=lfs merge=lfs -text")
    with pytest.raises(pages.PublishError, match="filter=lfs"):
        pages.assemble(site_dir, pages_dir, "development", docs_dir)


def test_assemble_rejects_lfs_pointers(tmp_path, site_dir, docs_dir):
    """A site holding an LFS pointer instead of an image is refused."""
    write(site_dir / "img.png", LFS_POINTER)
    with pytest.raises(pages.PublishError, match="development/img.png"):
        pages.assemble(site_dir, tmp_path / "pages", "development", docs_dir)


def test_assemble_requires_built_site(tmp_path, docs_dir):
    """Assembling before building reports the missing site."""
    with pytest.raises(pages.PublishError, match="no built site"):
        pages.assemble(tmp_path / "none", tmp_path / "pages", "development", docs_dir)


def test_assemble_returns_published_size(tmp_path, site_dir, docs_dir):
    """The size counts published files and leaves out hidden ones like .git."""
    pages_dir = tmp_path / "pages"
    write(pages_dir / ".git" / "objects" / "pack", b"0" * 4096)
    size = pages.assemble(site_dir, pages_dir, "development", docs_dir)
    assert size == pages.published_size(pages_dir)
    assert 0 < size < 4096


def test_assemble_rejects_oversized_site(tmp_path, site_dir, docs_dir, monkeypatch):
    """A site over the size guard is refused."""
    monkeypatch.setattr(pages, "MAX_SITE_BYTES", 10)
    with pytest.raises(pages.PublishError, match="GitHub Pages limit"):
        pages.assemble(site_dir, tmp_path / "pages", "development", docs_dir)
