"""Filesystem helpers for build-packages."""

from __future__ import annotations

import shutil
from pathlib import Path


def ensure_dir(path: Path) -> None:
    """Create directory if missing."""
    path.mkdir(parents=True, exist_ok=True)


def write_text(path: Path, content: str) -> None:
    """Write text file with trailing newline."""
    ensure_dir(path.parent)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def copy_file(src: Path, dst: Path) -> None:
    """Copy file while creating destination parent directories."""
    ensure_dir(dst.parent)
    shutil.copy2(src, dst)


def replace_tree(src: Path, dst: Path) -> None:
    """Copy tree replacing destination when it exists."""
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
