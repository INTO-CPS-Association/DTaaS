"""Markdown content replacement with path flexibility."""

import re
from typing import Tuple


class MarkdownReplacer:
    """Handles markdown-aware text replacement."""

    def __init__(self, clone_content: str, release_content: str):
        """
        Initialize replacer with prepared content.

        Args:
            clone_content: Content to search for
            release_content: Content to replace with (after substitution)
        """
        self.clone_content = clone_content.strip()
        self.release_content = release_content

    def replace_in_content(self, content: str) -> Tuple[str, bool]:
        """
        Replace clone content with release content.

        Args:
            content: Markdown content to process

        Returns:
            Tuple of (modified content, replacement occurred)
        """
        pattern = self._create_pattern(self.clone_content)
        match = pattern.search(content)

        if not match:
            return content, False

        start, end = match.start(), match.end()
        modified = content[:start] + self.release_content + content[end:]
        return modified, True

    def _create_pattern(self, clone_content: str) -> re.Pattern:
        """Create flexible regex pattern for matching."""
        # Replace 'cd ' commands before escaping (word boundary needed)
        flexible = re.sub(r"\bcd\s+\S+", "CD_PATH_PLACEHOLDER", clone_content)

        # Escape regex special characters
        pattern = re.escape(flexible)

        # Restore cd with flexible path matching
        pattern = pattern.replace("CD_PATH_PLACEHOLDER", r"cd\s+.+?(?=\n|$)")

        # Allow flexible whitespace
        pattern = pattern.replace(r"\ ", r"\s+")
        pattern = pattern.replace(r"\n", r"\s*\n\s*")

        return re.compile(pattern, re.MULTILINE)


def substitute_variables(template: str, version: str, url: str) -> str:
    """
    Substitute VERSION and URL in template.

    Args:
        template: Template with placeholders
        version: Version value
        url: URL value

    Returns:
        Template with substituted values
    """
    result = template.replace("VERSION", version)
    result = result.replace("URL", url)
    return result
