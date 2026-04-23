"""Credential sanitization utilities for injection prevention."""


def escape_js_string(value: str) -> str:
    """Escape a string for safe use in a JavaScript/Ruby single-quoted string.

    Escapes backslashes first, then single-quotes, to prevent injection in
    contexts such as MongoDB mongosh scripts and GitLab Rails runner scripts.

    Args:
        value: Raw string value

    Returns:
        Escaped value safe for embedding in single-quoted JS/Ruby strings
    """
    return value.replace("\\", "\\\\").replace("'", "\\'")
