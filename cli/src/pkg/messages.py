"""The shape of what the user commands print: one line, then its detail.

A run touches many users, so every failure, warning and skip opens with a
short line that reads at a glance, and keeps the detail a reader needs to
act on it in an indented line underneath. gitlab_common.with_hint builds
that string; this module adds the console half, so the many places that
report one user's outcome stay a single call each.
"""

import click

from ..gitlab_common import with_hint


def echo_hint(summary, hint):
    """Print *summary* on its own line, with *hint* indented underneath."""
    click.echo(with_hint(summary, hint))
