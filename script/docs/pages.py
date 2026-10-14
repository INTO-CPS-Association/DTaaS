"""Assemble the GitHub Pages site from built MkDocs output.

The published site holds one directory per documentation version
(development, version0.8, ...), one PDF per version and a landing page,
docs/redirect-page.html, that links to them.
"""

import re
import shutil
from datetime import date
from pathlib import Path

from mkdocs_hooks import find_unresolved_lfs_files, format_unresolved_files

DEVELOPMENT = "development"
BUILT_PDF = Path("pdf") / "DTaaS-docs.pdf"
# The files the landing page links to, relative to docs/. The page sits at
# the site root, outside every version directory, so it brings its own copy.
LANDING_ASSETS = (
    Path("assets") / "brand" / "dtaas-mark-white.svg",
    Path("assets") / "brand" / "dtaas-mark.svg",
    Path("assets") / "css" / "landing.css",
    Path("assets") / "fonts" / "inter-latin-400-normal.woff2",
    Path("assets") / "fonts" / "inter-latin-700-normal.woff2",
)
# Replaced by the current year when the landing page is installed.
YEAR_MARK = "{{ year }}"
RELEASE_TAG = re.compile(r"^v(\d+)\.(\d+)(?:\.\d+)*$")
# GitHub Pages refuses sites over 1 GB; stop with room to spare.
MAX_SITE_BYTES = 900 * 1024**2
MB = 1024**2


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


def published_size(pages_dir: Path) -> int:
    """Return the bytes GitHub Pages would publish from the directory.

    The Pages artifact leaves out hidden files and directories, such as .git.
    """
    return sum(
        path.stat().st_size
        for path in pages_dir.rglob("*")
        if path.is_file()
        and not any(part.startswith(".") for part in path.relative_to(pages_dir).parts)
    )


def reject_oversized_site(pages_dir: Path) -> int:
    """Refuse a site near the GitHub Pages size limit; return its size."""
    size = published_size(pages_dir)
    if size > MAX_SITE_BYTES:
        raise PublishError(
            f"the site is {size // MB} MB, over the {MAX_SITE_BYTES // MB} MB"
            " guard below the 1 GB GitHub Pages limit; archive old versions"
            " or shrink their media"
        )
    return size


# polyfill.io changed owner in 2024 and served malicious code. The versions
# published before then load it, so every assembly strips it from the site,
# and a release commits the cleaned pages back to webpage-docs.
POLYFILL_SOURCES = ('src="https://polyfill.io/', 'src="https://cdn.polyfill.io/')


def is_polyfill_tag(line: str) -> bool:
    """Whether a line is a script element that loads polyfill.io."""
    tag = line.strip()
    return (
        tag.startswith("<script")
        and tag.endswith("</script>")
        and any(source in tag for source in POLYFILL_SOURCES)
    )


def remove_polyfill(pages_dir: Path) -> int:
    """Remove every polyfill.io script line from the site; return the pages fixed."""
    root = pages_dir.resolve()
    fixed = 0
    for found in root.rglob("*.html"):
        # A symbolic link in the checkout could lead out of the site, and
        # nothing outside it is rewritten.
        page = found.resolve()
        if not page.is_relative_to(root):
            continue
        lines = page.read_text("utf-8").splitlines(keepends=True)
        kept = [line for line in lines if not is_polyfill_tag(line)]
        if len(kept) != len(lines):
            page.write_text("".join(kept), "utf-8")
            fixed += 1
    return fixed


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
    """Copy the landing page and the files it links to into the site root.

    The copyright line ends at the year the site is published, written in
    place of YEAR_MARK, so it never goes stale.
    """
    landing = (docs_dir / "redirect-page.html").read_text("utf-8")
    landing = landing.replace(YEAR_MARK, str(date.today().year))
    (pages_dir / "index.html").write_text(landing, "utf-8")
    for asset in LANDING_ASSETS:
        target = pages_dir / asset
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(docs_dir / asset, target)


def assemble(site_dir: Path, pages_dir: Path, version: str, docs_dir: Path) -> int:
    """Install a built version into the site, check it and return its size."""
    if not site_dir.is_dir():
        raise PublishError(f"no built site at {site_dir}; run the build first")
    reject_lfs_attributes(pages_dir)
    if version != DEVELOPMENT:
        require_release_row(docs_dir / "redirect-page.html", version)
    install_version(site_dir, pages_dir, version)
    install_landing_page(docs_dir, pages_dir)
    remove_polyfill(pages_dir)
    reject_lfs_pointers(pages_dir)
    return reject_oversized_site(pages_dir)
