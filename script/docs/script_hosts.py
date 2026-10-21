"""Find the pages of a built site that load from another host.

Every version of the site serves its own scripts and fonts: the assembly
rewrites the old published versions, which loaded MathJax from two CDNs and
fonts from Google, to the site's own copies. So no script and no stylesheet
or preconnect link may name another host, except the exact addresses in
ALLOWED_SOURCES. An address is listed whole, not by its host, because a CDN
serves any package, and a script from a package that changes owner runs on
every page that names it.
"""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ALLOWED_SOURCES: frozenset[str] = frozenset()
LINK_RELS = frozenset({"stylesheet", "preconnect"})


class ForeignSources(HTMLParser):
    """Collect the address of every script and of stylesheet and preconnect links."""

    def __init__(self) -> None:
        super().__init__()
        self.sources: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "script" and values.get("src"):
            self.sources.append(values["src"] or "")
        rels = set((values.get("rel") or "").lower().split())
        if tag == "link" and rels & LINK_RELS and values.get("href"):
            self.sources.append(values["href"] or "")


def foreign_sources(page: Path) -> set[str]:
    """Return the addresses on other hosts a page loads. A relative one has none."""
    parser = ForeignSources()
    parser.feed(page.read_text("utf-8", errors="replace"))
    return {source for source in parser.sources if urlsplit(source).hostname}


def foreign_scripts(site_dir: Path, allowed: frozenset[str] = ALLOWED_SOURCES) -> list[str]:
    """Return 'page: address' for every address outside the allowed ones."""
    found = []
    for page in sorted(site_dir.rglob("*.html")):
        for source in sorted(foreign_sources(page) - allowed):
            found.append(f"{page.relative_to(site_dir)}: {source}")
    return found
