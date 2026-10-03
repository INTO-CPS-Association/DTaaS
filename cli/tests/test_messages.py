"""Tests for the console message shape (pkg/messages.py)."""

from src.pkg.messages import echo_hint

SUMMARY = "GitLab provisioning failed for 'alice'."
HINT = "GitLab said: 403 Forbidden"


def test_echo_hint_prints_the_summary_first(capsys):
    """The first line is what a run full of users is scanned by."""
    echo_hint(SUMMARY, HINT)

    assert capsys.readouterr().out.splitlines()[0] == SUMMARY


def test_echo_hint_indents_the_detail_underneath(capsys):
    """The indent is what marks the second line as detail about the first."""
    echo_hint(SUMMARY, HINT)

    assert capsys.readouterr().out.splitlines()[1] == f"  {HINT}"
