"""Tests for is_namespace_path (gitlab_common/validators.py): the GitLab
group path of the template group."""

import pytest
from gitlab_common import is_namespace_path


@pytest.mark.parametrize(
    "value",
    ["dtaas", "my-org/dt_templates", "a.b/c/d", "_x", "a" * 255],
    ids=["group", "subgroup", "nested", "underscore-first", "longest-segment"],
)
def test_a_gitlab_group_path_is_accepted(value):
    """Letters, digits, _ . and -, with / between nested groups."""
    assert is_namespace_path(value)


@pytest.mark.parametrize(
    "value",
    [
        "",
        "-dtaas",
        "dtaas/",
        "/dtaas",
        "dt aas",
        "https://gitlab.com/dtaas",
        "dtaas.git",
        "dtaas/x.atom",
        ".",
        "..",
        "../x",
        "dtaas/..",
        "dtaas.",
        "dtaas\n",
        "a" * 256,
        "a" * 20000 + "!",
        42,
    ],
    ids=[
        "empty",
        "dash-first",
        "trailing-slash",
        "leading-slash",
        "space",
        "url",
        "git-suffix",
        "atom-suffix",
        "dot",
        "dot-dot",
        "parent-first",
        "parent-last",
        "dot-last",
        "newline",
        "segment-too-long",
        "long-hostile",
        "not-a-string",
    ],
)
def test_anything_else_is_refused(value):
    """Whatever GitLab would refuse as a group path (a segment ending in a
    dot among them, so '.' and '..' never leave the group), and a very long
    value is answered at once (the pattern is linear)."""
    assert not is_namespace_path(value)
