#!/usr/bin/env python3
"""Documentation content replacement tool - main entry point."""

import sys
from pathlib import Path

from config import load_config
from replacer import MarkdownReplacer, substitute_variables
from fileops import load_template, process_file


def get_paths(script_dir: Path) -> tuple:
    """Get required file paths."""
    project_root = script_dir.parent.parent
    config_path = project_root / "docs.ini"
    clone_path = project_root / "docs" / "publish" / "clone.md"
    release_path = project_root / "docs" / "publish" / "release.md"
    return project_root, config_path, clone_path, release_path


def load_configuration(config_path: Path):
    """Load and display configuration."""
    try:
        config = load_config(config_path)
        print(f"Configuration loaded: VERSION={config.version}")
        print(f"Files to process: {len(config.files)}")
        return config
    except (FileNotFoundError, ValueError) as e:
        print(f"Error loading configuration: {e}", file=sys.stderr)
        sys.exit(1)


def create_replacer(clone_path: Path, release_path: Path, config):
    """Create and initialize replacer."""
    clone_content = load_template(clone_path)
    release_template = load_template(release_path)

    release_content = substitute_variables(release_template, config.version, config.url)

    return MarkdownReplacer(clone_content, release_content)


def process_files(replacer, file_list: list, root: Path) -> int:
    """Process all files and return modification count."""
    modified_count = 0

    for file_rel_path in file_list:
        file_path = root / file_rel_path
        if process_file(file_path, replacer, file_rel_path):
            modified_count += 1

    return modified_count


def main():
    """Main entry point."""
    script_dir = Path(__file__).parent.resolve()
    root, cfg_path, clone, release = get_paths(script_dir)

    config = load_configuration(cfg_path)
    replacer = create_replacer(clone, release, config)
    modified = process_files(replacer, config.files, root)

    print(f"\nCompleted: {modified} file(s) modified")


if __name__ == "__main__":
    main()
