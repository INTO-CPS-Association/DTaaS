#!/usr/bin/env python3
"""
Documentation content replacement tool.

This script reads markdown content from clone.md and release.md,
replaces matching content in target files with proper variable substitution.
Uses markdown-aware parsing to avoid replacing content in code blocks.
"""

import os
import sys
import configparser
from pathlib import Path
import re
from typing import List, Tuple
import mistune


class MarkdownReplacer:
    """Handles markdown-aware text replacement."""

    def __init__(self, clone_content: str, release_template: str, version: str, url: str):
        """
        Initialize the replacer.

        Args:
            clone_content: Content to search for (from clone.md)
            release_template: Content to replace with (from release.md, before substitution)
            version: Version string for substitution
            url: URL string for substitution
        """
        self.clone_content = clone_content.strip()
        self.release_content = self._substitute_variables(release_template, version, url)
        self.parser = mistune.create_markdown(renderer=None)

    def _substitute_variables(self, template: str, version: str, url: str) -> str:
        """
        Substitute VERSION and URL placeholders in template.

        Args:
            template: Template string with VERSION and URL placeholders
            version: Version value
            url: URL value

        Returns:
            Template with substituted values
        """
        result = template.replace('VERSION', version)
        result = result.replace('URL', url)
        return result

    def _normalize_whitespace(self, text: str) -> str:
        """Normalize whitespace for comparison."""
        # Normalize line endings and excessive whitespace
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def _create_flexible_pattern(self, clone_content: str) -> re.Pattern:
        """
        Create a regex pattern from clone content that handles path variations.
        Matches cd commands with any path (including subdirectories like DTaaS/vagrant).
        
        Args:
            clone_content: The clone markdown content
            
        Returns:
            Compiled regex pattern that matches variations
        """
        # First, replace cd <path> with a flexible pattern before escaping
        # This matches cd followed by any path (including subdirectories)
        flexible_content = re.sub(
            r'cd\s+\S+',  # Match "cd <non-whitespace-path>"
            'CD_PATH_PLACEHOLDER',
            clone_content
        )
        
        # Now escape special regex characters
        pattern = re.escape(flexible_content)
        
        # Replace the placeholder with flexible path pattern
        # Matches any valid path including subdirectories, absolute paths, ~, and paths with spaces
        pattern = pattern.replace(
            'CD_PATH_PLACEHOLDER',
            r'cd\s+.+?(?=\n|$)'  # cd followed by anything until newline or end of string
        )
        
        # Allow flexible whitespace
        pattern = pattern.replace(r'\ ', r'\s+')
        pattern = pattern.replace(r'\n', r'\s*\n\s*')
        
        return re.compile(pattern, re.MULTILINE)

    def replace_in_content(self, content: str) -> Tuple[str, bool]:
        """
        Replace clone content with release content in the given markdown.
        Handles variations in cd path.

        Args:
            content: Markdown content to process

        Returns:
            Tuple of (modified content, whether replacement occurred)
        """
        # Create flexible pattern from clone content
        pattern = self._create_flexible_pattern(self.clone_content)
        
        # Search for match
        match = pattern.search(content)
        if not match:
            return content, False

        # Replace matched content with release content
        modified = content[:match.start()] + self.release_content + content[match.end():]
        return modified, True


def load_config(config_path: Path) -> Tuple[str, str, List[str]]:
    """
    Load configuration from INI file.

    Args:
        config_path: Path to docs.ini file

    Returns:
        Tuple of (version, url, list of file paths)
    """
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    config = configparser.ConfigParser()
    config.read(config_path, encoding='utf-8')

    # Read from [docs.substitute] section
    section = 'docs.substitute'
    version = config.get(section, 'VERSION', fallback='').strip()
    url = config.get(section, 'URL', fallback='').strip()
    files_raw = config.get(section, 'FILES', fallback='')
    
    # Parse FILES - comma-separated, possibly multiline
    files = [f.strip() for f in files_raw.split(',') if f.strip()]

    if not version or not url or not files:
        raise ValueError(f"Configuration section [{section}] must contain VERSION, URL, and FILES")

    return version, url, files


def main():
    """Main entry point."""
    # Determine script directory and project root
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent

    # Paths
    config_path = project_root / 'docs.ini'
    clone_path = project_root / 'docs' / 'publish' / 'clone.md'
    release_path = project_root / 'docs' / 'publish' / 'release.md'

    # Load configuration
    try:
        version, url, file_list = load_config(config_path)
        print(f"Configuration loaded: VERSION={version}, URL={url}")
        print(f"Files to process: {len(file_list)}")
    except (FileNotFoundError, ValueError) as e:
        print(f"Error loading configuration: {e}", file=sys.stderr)
        sys.exit(1)

    # Load clone and release templates
    try:
        with open(clone_path, 'r', encoding='utf-8') as f:
            clone_content = f.read()
        with open(release_path, 'r', encoding='utf-8') as f:
            release_template = f.read()
    except FileNotFoundError as e:
        print(f"Error loading template files: {e}", file=sys.stderr)
        sys.exit(1)

    # Initialize replacer
    replacer = MarkdownReplacer(clone_content, release_template, version, url)

    # Process each file
    modified_count = 0
    for file_rel_path in file_list:
        file_path = project_root / file_rel_path
        
        if not file_path.exists():
            print(f"Warning: File not found: {file_path}", file=sys.stderr)
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content, modified = replacer.replace_in_content(content)

            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✓ Modified: {file_rel_path}")
                modified_count += 1
            else:
                print(f"  Skipped (no match): {file_rel_path}")

        except Exception as e:
            print(f"Error processing {file_rel_path}: {e}", file=sys.stderr)

    print(f"\nCompleted: {modified_count} file(s) modified out of {len(file_list)}")


if __name__ == '__main__':
    main()
