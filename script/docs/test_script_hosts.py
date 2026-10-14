"""Tests for the check on the hosts a built site loads scripts from."""

from pathlib import Path

from script_hosts import foreign_scripts

import docs


def page(site: Path, name: str, body: str) -> None:
    """Write one HTML page into a site directory."""
    path = site / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"<html><head>{body}</head></html>", "utf-8")


def test_local_and_allowed_scripts_pass(tmp_path: Path) -> None:
    """Local and allowed scripts pass."""
    page(tmp_path, "index.html", '<script src="assets/js/mathjax-config.js"></script>')
    page(
        tmp_path,
        "version1.0/index.html",
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js">'
        "</script>",
    )
    assert not foreign_scripts(tmp_path)


def test_an_unlisted_host_is_reported(tmp_path: Path) -> None:
    """An unlisted host is reported."""
    page(
        tmp_path,
        "version0.3/user/index.html",
        '<SCRIPT SRC="https://polyfill.io/v3/polyfill.min.js?features=es6"></SCRIPT>',
    )
    assert foreign_scripts(tmp_path) == ["version0.3/user/index.html: polyfill.io"]


def test_a_protocol_relative_src_is_reported(tmp_path: Path) -> None:
    """A protocol relative src is reported."""
    page(tmp_path, "index.html", '<script src="//evil.example/x.js"></script>')
    assert foreign_scripts(tmp_path) == ["index.html: evil.example"]


def test_the_command_fails_on_an_unlisted_host(tmp_path: Path, capsys) -> None:
    """The command fails on an unlisted host."""
    page(tmp_path, "index.html", '<script src="https://polyfill.io/x.js"></script>')
    assert docs.main(["check-scripts", "--site-dir", str(tmp_path)]) == 1
    assert "polyfill.io" in capsys.readouterr().err
