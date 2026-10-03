"""One shape for the messages this package and its consumers print.

A run can touch many users, so a failure says what went wrong in one short
line that reads at a glance, and carries the detail a reader needs to act on
it in an indented line underneath. Every message built here follows that
shape, so the first line stays scannable however long the detail grows.
"""

HINT_INDENT = "  "


def with_hint(summary, hint):
    """*summary* on its own line, with *hint* indented underneath.

    Each line of *hint* is indented, so a message that already carries a hint
    of its own keeps its shape when it becomes the detail of another, and an
    empty *hint* leaves *summary* alone rather than a trailing blank line.
    """
    detail = [f"{HINT_INDENT}{line}" for line in str(hint).splitlines()]
    return "\n".join([summary, *detail])
