"""Tests for the check on the hosts a built site loads scripts from."""

from pathlib import Path

from script_hosts import foreign_scripts

import docs


def page(site: Path, name: str, body: str) -> None:
    """Write one HTML page into a site directory."""
    path = site / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"<html><head>{body}</head></html>", "utf-8")


def test_local_scripts_pass(tmp_path: Path) -> None:
    """Scripts and stylesheets of the site itself pass."""
    page(tmp_path, "index.html", '<script src="assets/js/mathjax-config.js"></script>')
    page(tmp_path, "a/index.html", '<link rel="stylesheet" href="../assets/css/x.css">')
    assert not foreign_scripts(tmp_path)


def test_a_cdn_mathjax_is_reported(tmp_path: Path) -> None:
    """A MathJax from a CDN is reported, since assembly replaces it."""
    source = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js"
    page(tmp_path, "version1.0/index.html", f'<script src="{source}"></script>')
    assert foreign_scripts(tmp_path) == [f"version1.0/index.html: {source}"]


def test_an_exact_address_can_be_allowed(tmp_path: Path) -> None:
    """An allowed address passes, and another file on its host does not."""
    allowed = "https://cdn.example/lib@1.0.0/lib.js"
    page(tmp_path, "index.html", f'<script src="{allowed}"></script>')
    page(tmp_path, "b.html", '<script src="https://cdn.example/other.js"></script>')
    assert foreign_scripts(tmp_path, frozenset({allowed})) == [
        "b.html: https://cdn.example/other.js"
    ]


def test_google_fonts_links_are_reported(tmp_path: Path) -> None:
    """Stylesheet and preconnect links to another host are reported."""
    page(
        tmp_path,
        "index.html",
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">'
        '<link rel="canonical" href="https://example.org/">',
    )
    assert foreign_scripts(tmp_path) == [
        "index.html: https://fonts.googleapis.com/css?family=Roboto",
        "index.html: https://fonts.gstatic.com",
    ]


def test_an_unlisted_host_is_reported(tmp_path: Path) -> None:
    """An unlisted host is reported."""
    page(
        tmp_path,
        "version0.3/user/index.html",
        '<SCRIPT SRC="https://polyfill.io/v3/polyfill.min.js?features=es6"></SCRIPT>',
    )
    assert foreign_scripts(tmp_path) == [
        "version0.3/user/index.html: https://polyfill.io/v3/polyfill.min.js?features=es6"
    ]


def test_a_protocol_relative_src_is_reported(tmp_path: Path) -> None:
    """A protocol relative src is reported."""
    page(tmp_path, "index.html", '<script src="//evil.example/x.js"></script>')
    assert foreign_scripts(tmp_path) == ["index.html: //evil.example/x.js"]


def test_the_command_fails_on_an_unlisted_host(tmp_path: Path, capsys) -> None:
    """The command fails on an unlisted host."""
    page(tmp_path, "index.html", '<script src="https://polyfill.io/x.js"></script>')
    assert docs.main(["check-scripts", "--site-dir", str(tmp_path)]) == 1
    assert "polyfill.io" in capsys.readouterr().err
