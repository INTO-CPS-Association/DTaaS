"""Assemble the GitHub Pages site from built MkDocs output.

The published site holds one directory per documentation version
(development, version0.8, ...), one PDF per version and a landing page,
docs/redirect-page.html, that links to them.
"""

import re
import shutil
from pathlib import Path

from mkdocs_hooks import find_unresolved_lfs_files, format_unresolved_files

DEVELOPMENT = "development"
BUILT_PDF = Path("pdf") / "DTaaS-docs.pdf"
BRAND_LOGO = Path("assets") / "brand" / "dtaas-logo-full.svg"
RELEASE_TAG = re.compile(r"^v(\d+)\.(\d+)(?:\.\d+)*$")


class PublishError(Exception):
    """Raised when the site cannot be assembled safely."""


def version_name(tag: str | None) -> str:
    """Return the site directory for a release tag; v1.0 gives version1.0.

    Without a tag, the site directory is the development one.
    """
    if not tag:
        return DEVELOPMENT
    match = RELEASE_TAG.match(tag)
    if match is None:
        raise PublishError(f"tag '{tag}' is not a release tag like v1.0 or v0.8.0")
    major, minor = match.groups()
    return f"version{major}.{minor}"


def reject_lfs_attributes(pages_dir: Path) -> None:
    """Refuse a site whose Git attributes would store images in Git LFS.

    GitHub Pages serves an LFS pointer file instead of the image it names.
    """
    attributes = pages_dir / ".gitattributes"
    if attributes.is_file() and "filter=lfs" in attributes.read_text("utf-8"):
        raise PublishError(
            f"{attributes} routes files through Git LFS, which GitHub Pages"
            " does not serve; remove its filter=lfs rules"
        )


def reject_lfs_pointers(site_dir: Path) -> None:
    """Refuse a site that holds LFS pointer files instead of media."""
    pointers = find_unresolved_lfs_files(site_dir)
    if pointers:
        raise PublishError(
            "Git LFS pointers instead of media:\n"
            + format_unresolved_files(pointers, site_dir)
        )


def require_release_row(landing_page: Path, version: str) -> None:
    """Refuse a release whose version has no row on the landing page."""
    if f'href="{version}/index.html"' not in landing_page.read_text("utf-8"):
        raise PublishError(
            f"{landing_page} has no row for {version}; add one that links"
            f" {version}/index.html before publishing the release"
        )


def install_version(site_dir: Path, pages_dir: Path, version: str) -> None:
    """Replace the version's directory and PDF with the built ones."""
    target = pages_dir / version
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(site_dir, target)
    pdf = target / BUILT_PDF
    if pdf.is_file():
        shutil.move(pdf, pages_dir / f"DTaaS-{version}.pdf")
        shutil.rmtree(pdf.parent)


def install_landing_page(docs_dir: Path, pages_dir: Path) -> None:
    """Copy the landing page and the logo it shows into the site root."""
    shutil.copyfile(docs_dir / "redirect-page.html", pages_dir / "index.html")
    logo = pages_dir / BRAND_LOGO
    logo.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(docs_dir / BRAND_LOGO, logo)


def assemble(site_dir: Path, pages_dir: Path, version: str, docs_dir: Path) -> None:
    """Install a built version into the site and check the result."""
    if not site_dir.is_dir():
        raise PublishError(f"no built site at {site_dir}; run the build first")
    reject_lfs_attributes(pages_dir)
    if version != DEVELOPMENT:
        require_release_row(docs_dir / "redirect-page.html", version)
    install_version(site_dir, pages_dir, version)
    install_landing_page(docs_dir, pages_dir)
    reject_lfs_pointers(pages_dir)
