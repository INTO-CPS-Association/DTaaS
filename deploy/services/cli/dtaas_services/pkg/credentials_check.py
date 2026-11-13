"""The check of config/credentials.csv that holds for every service, made
once by 'user add' before any service reads the file.

A username listed on two rows would be provisioned twice: a second account
attempt or a second password set, and on GitLab warnings about the projects
the first row just made. GitLab ignores case in usernames (one account per
name, in any case), so 'Alice' and 'alice' are one GitLab user, and the
check ignores case for every service.
"""

import csv
from pathlib import Path


def _username(row: dict) -> str:
    """The row's username, without the spaces around it."""
    return (row.get("username") or "").strip()


def _repeat_message(path: Path, name: str, lines: tuple[int, int]) -> str:
    """Why *path* cannot be used: *name* on both *lines*."""
    first, again = lines
    return (
        f"config/{path.name} lists the username '{name}' on line {first} and "
        f"again on line {again} (usernames are compared ignoring case, as "
        "GitLab does). Remove one of the two rows, then run the command again."
    )


def _first_repeat(reader: csv.DictReader, path: Path) -> str:
    """Why *reader*'s rows cannot be used: the first username on a second
    row, ignoring case and the spaces around it, or ""."""
    seen: dict[str, int] = {}
    for row in reader:
        name = _username(row)
        first = seen.setdefault(name.lower(), reader.line_num)
        if name and first != reader.line_num:
            return _repeat_message(path, name, (first, reader.line_num))
    return ""


def duplicate_username_error(path: Path) -> str:
    """Why the credentials file *path* cannot be used: a username on two
    rows, or the file cannot be read. "" when each user is listed once, or
    when there is no file, which each service reports itself."""
    if not path.exists():
        return ""
    try:
        with path.open("r", newline="", encoding="utf-8") as handle:
            return _first_repeat(csv.DictReader(handle), path)
    except (OSError, UnicodeDecodeError, csv.Error) as exc:
        return f"config/{path.name} cannot be read: {exc}"
