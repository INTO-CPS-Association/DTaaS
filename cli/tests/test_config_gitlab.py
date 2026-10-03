"""Tests for the [gitlab] value rules shared by Config and config validate
(config_gitlab.py)."""

import pytest
from src.pkg.config_gitlab import (
    MINUTE_KEYS,
    gitlab_minutes,
    gitlab_template_values,
    minutes_problem,
)

TEMPLATE = {
    "common_template": "https://gitlab.com/dtaas/common.git",
    "user_template": "https://gitlab.com/dtaas/user1.git",
}


def test_template_values_are_trimmed():
    """Both keys are read together, with surrounding spaces removed."""
    padded = {key: f"  {value} " for key, value in TEMPLATE.items()}
    assert gitlab_template_values(padded) == (TEMPLATE, None)


def test_no_template_key_is_an_opt_out():
    """A [gitlab] block predating the template keys is not a problem: the
    project step is skipped rather than given a repository to invent."""
    assert gitlab_template_values({"provision": True}) == (None, None)


def test_a_partial_template_names_the_missing_keys():
    """One key set is a typo, so the problem says which one is absent."""
    values, problem = gitlab_template_values({"common_template": "https://x.io/y"})
    assert values is None
    assert "gitlab.user_template" in problem


@pytest.mark.parametrize("key", MINUTE_KEYS)
def test_a_minute_key_is_optional(key):
    """Without the key the caller keeps its own default."""
    assert gitlab_minutes(dict(TEMPLATE), key) == (None, None)


@pytest.mark.parametrize("key", MINUTE_KEYS)
def test_a_minute_key_reads_whole_minutes(key):
    """A positive whole number of minutes is what the waits are budgeted in."""
    assert gitlab_minutes({key: 25}, key) == (25, None)


@pytest.mark.parametrize("key", MINUTE_KEYS)
@pytest.mark.parametrize("value", [0, -5, 1.5, "10", True])
def test_a_minute_key_rejects_anything_else(key, value):
    """Zero, a negative, a fraction, a string and a bool are all mistakes: a
    budget that cannot be waited out would fail every import."""
    assert gitlab_minutes({key: value}, key) == (None, minutes_problem(key))
