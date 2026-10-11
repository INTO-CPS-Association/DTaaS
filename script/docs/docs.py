"""Build, preview and publish the DTaaS documentation.

Run from any directory with the MkDocs requirements installed:

  python script/docs/docs.py build [--version NAME] [--pdf] [--site-dir DIR]
  python script/docs/docs.py serve
  python script/docs/docs.py version [TAG]
  python script/docs/docs.py assemble --version NAME --site-dir DIR \\
      --pages-dir DIR

build and serve fetch the documentation media from Git LFS first.
PDF export needs mkdocs.yml and its with-pdf plugin, which work only on
Linux; without --pdf the build uses mkdocs-github.yml on any platform.
"""

import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

import pages

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = REPO_ROOT / "docs"
PDF_CONFIG = "mkdocs.yml"
HTML_CONFIG = "mkdocs-github.yml"


def run(*command: str, env: dict[str, str] | None = None) -> None:
    """Run a command from the repository root, failing on a non-zero exit."""
    subprocess.run(command, cwd=REPO_ROOT, env=env, check=True)


def fetch_lfs_media() -> None:
    """Replace the LFS pointers under docs/ with the media they name."""
    if shutil.which("git-lfs") is None:
        raise pages.PublishError("git-lfs is not installed; install it and rerun")
    run("git", "lfs", "install", "--local")
    run("git", "lfs", "pull", "--include=docs/**")


def mkdocs(*arguments: str, pdf: bool = False) -> None:
    """Run MkDocs with the configuration that matches the PDF choice."""
    env = {**os.environ, "MKDOCS_ENABLE_PDF_EXPORT": "1" if pdf else "0"}
    config = PDF_CONFIG if pdf else HTML_CONFIG
    run(sys.executable, "-m", "mkdocs", *arguments, "--config-file", config, env=env)


def build(args: argparse.Namespace) -> None:
    """Build one documentation version into a site directory."""
    if args.pdf and platform.system() != "Linux":
        raise pages.PublishError("PDF export works only on Linux; drop --pdf")
    site_dir = Path(args.site_dir or REPO_ROOT / "site" / args.version).resolve()
    fetch_lfs_media()
    mkdocs("build", "--site-dir", str(site_dir), pdf=args.pdf)
    print(f"built {args.version} into {site_dir}")


def serve(_args: argparse.Namespace) -> None:
    """Preview the documentation with live reload."""
    fetch_lfs_media()
    mkdocs("serve")


def version(args: argparse.Namespace) -> None:
    """Print the site directory for a release tag."""
    print(pages.version_name(args.tag))


def assemble(args: argparse.Namespace) -> None:
    """Install a built version into a checkout of the published site."""
    size = pages.assemble(
        Path(args.site_dir).resolve(),
        Path(args.pages_dir).resolve(),
        args.version,
        DOCS_DIR,
    )
    print(
        f"installed {args.version} into {args.pages_dir}; site is {size // pages.MB} MB"
    )


def parser() -> argparse.ArgumentParser:
    """Describe the command line."""
    root = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    commands = root.add_subparsers(dest="command", required=True)
    build_cmd = commands.add_parser("build", help="build one version")
    build_cmd.add_argument("--version", default=pages.DEVELOPMENT)
    build_cmd.add_argument("--site-dir", help="default: site/<version>")
    build_cmd.add_argument("--pdf", action="store_true", help="also build the PDF")
    build_cmd.set_defaults(handler=build)
    commands.add_parser("serve", help="preview with live reload").set_defaults(
        handler=serve
    )
    version_cmd = commands.add_parser("version", help="site directory for a tag")
    version_cmd.add_argument("tag", nargs="?")
    version_cmd.set_defaults(handler=version)
    assemble_cmd = commands.add_parser("assemble", help="install into the site")
    for option in ("--version", "--site-dir", "--pages-dir"):
        assemble_cmd.add_argument(option, required=True)
    assemble_cmd.set_defaults(handler=assemble)
    return root


def main(argv: list[str] | None = None) -> int:
    """Run one command; report failures without a traceback."""
    args = parser().parse_args(argv)
    try:
        args.handler(args)
    except (pages.PublishError, subprocess.CalledProcessError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
