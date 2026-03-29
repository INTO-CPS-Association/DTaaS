"""Entrypoint and CLI parsing for build-packages."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from src.generator import build_packages, clean_packages
    from src.layout import build_packages_root, package_root, source_root
    from src.settings import load_images
else:
    from .generator import build_packages, clean_packages
    from .layout import build_packages_root, package_root, source_root
    from .settings import load_images


def parse_args() -> argparse.Namespace:
    """Parse script arguments."""
    parser = argparse.ArgumentParser(
        description="Generate deploy/dtaas/docker self-contained packages"
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[5],
        help="Repository root directory",
    )
    parser.add_argument("--build", action="store_true", help="Build package folders")
    parser.add_argument("--clean", action="store_true", help="Remove generated packages")
    args = parser.parse_args()
    if not args.build and not args.clean:
        args.build = True
    return args


def main() -> None:
    """Execute build-packages workflow."""
    args = parse_args()
    repo_root = args.root.resolve()
    output_root = package_root(repo_root)
    if args.clean:
        clean_packages(output_root)
    if args.build:
        config_path = build_packages_root(repo_root) / "dtaas.toml"
        images = load_images(config_path)
        build_packages(source_root(repo_root), output_root, images)
