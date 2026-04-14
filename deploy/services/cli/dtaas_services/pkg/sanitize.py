"""Credential sanitization utilities for injection prevention."""


def escape_sql_identifier(value: str) -> str:
    """Escape a string for safe use as a SQL identifier (double-quoted).

    Doubles any double-quote characters to prevent SQL injection in
    identifiers such as usernames and database names.

    Args:
        value: Raw identifier string

    Returns:
        Escaped identifier safe for embedding between double-quotes
    """
    return value.replace('"', '""')


def escape_sql_literal(value: str) -> str:
    """Escape a string for safe use as a SQL string literal (single-quoted).

    Doubles any single-quote characters to prevent SQL injection in
    string literals such as passwords.

    Args:
        value: Raw literal string

    Returns:
        Escaped literal safe for embedding between single-quotes
    """
    return value.replace("'", "''")


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
