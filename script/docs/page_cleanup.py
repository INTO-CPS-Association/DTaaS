"""Rewrite published pages so that they load nothing from another host.

The versions published before the site served its own files load MathJax
from two CDNs, Google Fonts, and polyfill.io, which changed owner in 2024
and served malicious code. Every assembly rewrites those pages: the first
MathJax script becomes the local MathJax 3 and its configuration, any other
MathJax script is removed, and polyfill.io scripts and Google Fonts links are
removed (Material then uses the system fonts). A release commits the cleaned
pages back to webpage-docs.
"""

import os
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

POLYFILL_HOSTS = frozenset({"polyfill.io", "cdn.polyfill.io"})
FONT_HOSTS = frozenset({"fonts.googleapis.com", "fonts.gstatic.com"})
FONT_RELS = frozenset({"stylesheet", "preconnect"})
MATHJAX_SCRIPTS = frozenset(
    {
        "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
        "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js",
    }
)
# Relative to docs/ and to the site root. The configuration loads first,
# since MathJax reads it when it starts.
LOCAL_MATHJAX = (
    Path("assets") / "js" / "mathjax-config.js",
    Path("assets") / "js" / "mathjax-3.2.2" / "tex-svg.js",
)


def is_mathjax(source: str) -> bool:
    """Whether a script src is one of the CDN copies of MathJax."""
    return source.split("?", 1)[0] in MATHJAX_SCRIPTS


class ForeignTags(HTMLParser):
    """Find the elements of one page to remove, and the MathJax ones.

    Each is recorded as (kind, start, end), offsets into the page text, with
    kind "mathjax" or "drop".
    """

    def __init__(self, text: str) -> None:
        super().__init__(convert_charrefs=False)
        self.line_starts = [0]
        for line in text.splitlines(keepends=True):
            self.line_starts.append(self.line_starts[-1] + len(line))
        self.found: list[tuple[str, int, int]] = []
        self.open_script: tuple[str, int] | None = None

    def position(self) -> int:
        """The offset in the page text of the tag being parsed."""
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name: value or "" for name, value in attrs}
        if tag == "script":
            kind = script_kind(values.get("src", ""))
            if kind:
                self.open_script = (kind, self.position())
        elif tag == "link" and font_link(values):
            start = self.position()
            self.found.append(("drop", start, start + len(self.get_starttag_text() or "")))

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self.open_script:
            kind, start = self.open_script
            self.found.append((kind, start, self.position() + len("</script>")))
            self.open_script = None


def script_kind(source: str) -> str | None:
    """'mathjax' or 'drop' for a script to rewrite, None for one to keep."""
    if is_mathjax(source):
        return "mathjax"
    if urlsplit(source).hostname in POLYFILL_HOSTS:
        return "drop"
    return None


def font_link(values: dict[str, str]) -> bool:
    """Whether a link element loads Google Fonts or connects to them."""
    rels = set(values.get("rel", "").lower().split())
    return bool(rels & FONT_RELS) and urlsplit(values.get("href", "")).hostname in FONT_HOSTS


def whole_lines(text: str, start: int, end: int) -> tuple[int, int]:
    """Widen a span to its lines when nothing else stands on them."""
    line_start = text.rfind("\n", 0, start) + 1
    line_end = text.find("\n", end)
    line_end = len(text) if line_end == -1 else line_end + 1
    if text[line_start:start].strip() or text[end:line_end].strip():
        return start, end
    return line_start, line_end


def local_mathjax(page: Path, root: Path) -> list[str]:
    """The script elements that load the site's own MathJax from a page."""
    tags = []
    for asset in LOCAL_MATHJAX:
        source = Path(os.path.relpath(root / asset, page.parent)).as_posix()
        tags.append(f'<script src="{source}"></script>')
    return tags


def indented(text: str, start: int, tags: list[str]) -> str:
    """Join tags one per line, at the indentation of the element they replace."""
    line_start = text.rfind("\n", 0, start) + 1
    before = text[line_start:start]
    separator = "\n" + before if not before.strip() else ""
    return separator.join(tags)


def rewrite(text: str, replacement: list[str]) -> str:
    """Return the page with its foreign elements removed or replaced."""
    parser = ForeignTags(text)
    parser.feed(text)
    parser.close()
    first_mathjax = next((s for k, s, _ in parser.found if k == "mathjax"), None)
    for kind, start, end in sorted(parser.found, key=lambda found: -found[1]):
        if kind == "mathjax" and start == first_mathjax:
            text = text[:start] + indented(text, start, replacement) + text[end:]
        else:
            low, high = whole_lines(text, start, end)
            text = text[:low] + text[high:]
    return text


def clean_pages(pages_dir: Path) -> int:
    """Rewrite every page of the site that loads from a CDN, and count them."""
    root = os.path.realpath(pages_dir)
    fixed = 0
    for found in Path(root).rglob("*.html"):
        # A symbolic link in the checkout could lead out of the site, and
        # nothing outside it is rewritten.
        real = os.path.realpath(found)
        if os.path.commonpath([root, real]) != root:
            continue
        page = Path(real)
        text = page.read_text("utf-8")
        cleaned = rewrite(text, local_mathjax(page, root))
        if cleaned != text:
            page.write_text(cleaned, "utf-8")
            fixed += 1
    return fixed
