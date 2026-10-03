"""Tests for the shared message shape (gitlab_common/messages.py)."""

from gitlab_common.messages import with_hint

SUMMARY = "GitLab refused the account for 'alice'."
HINT = "Check that the PAT owner is an administrator."


def test_with_hint_keeps_the_summary_on_its_own_line():
    """The first line is what a run full of users is scanned by, so the hint
    never joins it."""
    assert with_hint(SUMMARY, HINT).splitlines()[0] == SUMMARY


def test_with_hint_indents_the_hint_underneath():
    """The indent is what marks the second line as detail about the first."""
    assert with_hint(SUMMARY, HINT).splitlines()[1] == f"  {HINT}"


def test_with_hint_without_a_hint_is_the_summary_alone():
    """A caller with nothing to add gets no trailing blank line for it."""
    assert with_hint(SUMMARY, "") == SUMMARY


def test_with_hint_keeps_a_nested_hints_shape():
    """A message that already has a hint becomes the detail of another
    without its own detail running back into the margin."""
    inner = with_hint(SUMMARY, HINT)

    assert with_hint("Warning: 'alice' needs attention.", inner).splitlines()[2] == (
        f"    {HINT}"
    )
