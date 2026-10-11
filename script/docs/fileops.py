"""File processing utilities."""

import sys
from pathlib import Path


def load_template(file_path: Path) -> str:
    """
    Load markdown template from file.

    Args:
        file_path: Path to template file

    Returns:
        File content as string
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError as e:
        print(f"Template file not found: {e}", file=sys.stderr)
        sys.exit(1)


def process_file(file_path: Path, replacer, relative_path: str) -> bool:
    """
    Process single markdown file.

    Args:
        file_path: Absolute path to file
        replacer: MarkdownReplacer instance
        relative_path: Relative path for display

    Returns:
        True if file was modified
    """
    modified = False

    if not file_path.exists():
        print(f"Warning: File not found: {file_path}", file=sys.stderr)
    elif _process_file_content(file_path, replacer, relative_path):
        modified = True

    return modified


def _process_file_content(file_path: Path, replacer, relative_path: str) -> bool:
    """Process file content and return modification status."""
    try:
        content = _read_file(file_path)
        new_content, modified = replacer.replace_in_content(content)

        if modified:
            _write_file(file_path, new_content)
            print(f"✓ Modified: {relative_path}")
        else:
            print(f"  Skipped (no match): {relative_path}")

        return modified

    except Exception as e:
        print(f"Error processing {relative_path}: {e}", file=sys.stderr)
        return False


def _read_file(file_path: Path) -> str:
    """Read file content."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def _write_file(file_path: Path, content: str) -> None:
    """Write file content."""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
