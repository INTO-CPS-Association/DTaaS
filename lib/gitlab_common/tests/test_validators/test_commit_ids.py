"""Tests for is_commit_id (gitlab_common/validators.py): the commit a
template is pinned to."""

import pytest
from gitlab_common import is_commit_id


@pytest.mark.parametrize(
    "value",
    [
        "299d6e62e3addf074b2bbaffe4c5804ee096255c",
        "A1D75F4A85221B236CCDC5E9AE7640DC5FB17FCF",
    ],
    ids=["lower-case", "upper-case"],
)
def test_a_full_commit_id_is_accepted(value):
    """40 hexadecimal characters, in either case."""
    assert is_commit_id(value)


@pytest.mark.parametrize(
    "value",
    [
        "299d6e62",
        "299d6e62e3addf074b2bbaffe4c5804ee096255c0",
        "main",
        "-299d6e62e3addf074b2bbaffe4c5804ee096255",
        "299d6e62e3addf074b2bbaffe4c5804ee096255c\n",
        "g" * 40,
        "a" * 64,
        "a" * 20000 + "!",
        None,
    ],
    ids=[
        "short",
        "too-long",
        "branch",
        "option-like",
        "newline",
        "not-hex",
        "sha256-length",
        "long-hostile",
        "not-a-string",
    ],
)
def test_anything_but_a_full_commit_id_is_refused(value):
    """A shortened id, a branch name, or a value git could read as an
    option is never taken for a commit."""
    assert not is_commit_id(value)
