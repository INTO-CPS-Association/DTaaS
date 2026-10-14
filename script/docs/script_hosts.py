"""Find the pages of a built site that load a script from an unapproved host.

The development version loads no script from another host. The released
versions on webpage-docs load MathJax from the two CDNs below, and nothing
else may appear: a script from a host that changes owner runs on every page
that names it.
"""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ALLOWED_HOSTS = frozenset({"cdn.jsdelivr.net", "cdnjs.cloudflare.com"})


class ScriptSources(HTMLParser):
    """Collect the src of every script element of one page."""

    def __init__(self) -> None:
        super().__init__()
        self.sources: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script":
            source = dict(attrs).get("src")
            if source:
                self.sources.append(source)


def script_hosts(page: Path) -> set[str]:
    """Return the hosts a page loads scripts from; a relative src has none."""
    parser = ScriptSources()
    parser.feed(page.read_text("utf-8", errors="replace"))
    return {urlsplit(source).hostname or "" for source in parser.sources} - {""}


def foreign_scripts(site_dir: Path, allowed: frozenset[str] = ALLOWED_HOSTS) -> list[str]:
    """Return 'page: host' for every script host outside the allowed ones."""
    found = []
    for page in sorted(site_dir.rglob("*.html")):
        for host in sorted(script_hosts(page) - allowed):
            found.append(f"{page.relative_to(site_dir)}: {host}")
    return found
