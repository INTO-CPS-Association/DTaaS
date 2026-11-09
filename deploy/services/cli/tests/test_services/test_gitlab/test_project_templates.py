"""Tests for the template settings of the GitLab project step
(project_templates.py)."""

from pathlib import Path

import pytest
from dotenv import dotenv_values
from dtaas_services.pkg.services.gitlab.project_templates import read_templates
# pylint: disable=W0621

TEMPLATE = (
    Path(__file__).resolve().parents[3]
    / "dtaas_services"
    / "templates"
    / "config"
    / "services.env.template"
)
KEYS = ("GITLAB_TEMPLATE_HOST", "GITLAB_TEMPLATE_GROUP")
GROUP_ERROR = (
    "GITLAB_TEMPLATE_GROUP must be a GitLab group path, such as dtaas or "
    "dtaas/templates"
)
HOST_ERROR = "GITLAB_TEMPLATE_HOST must be a valid URL"
TOGETHER = (
    "GITLAB_TEMPLATE_GROUP and GITLAB_TEMPLATE_HOST must both be set, "
    "or both left out"
)


@pytest.fixture
def settings(monkeypatch):
    """Set the template keys to the given values: None unsets a key."""

    def apply(host, group):
        for key, value in zip(KEYS, (host, group)):
            if value is None:
                monkeypatch.delenv(key, raising=False)
            else:
                monkeypatch.setenv(key, value)

    return apply


def test_the_shipped_template_names_the_dtaas_templates(settings):
    """A project generated from the template fills its users' projects from
    the dtaas group on gitlab.com."""
    shipped = dotenv_values(TEMPLATE)
    settings(shipped["GITLAB_TEMPLATE_HOST"], shipped["GITLAB_TEMPLATE_GROUP"])

    assert read_templates() == (
        {
            "common": "https://gitlab.com/dtaas/common.git",
            "user": "https://gitlab.com/dtaas/user1.git",
        },
        "",
    )


def test_changed_settings_build_the_urls(settings):
    """Another host, with a port and a path, and a subgroup."""
    settings(" https://git.example.org:8443/gitlab/ ", "org/templates")

    urls, error = read_templates()

    assert error == ""
    assert urls["user"] == "https://git.example.org:8443/gitlab/org/templates/user1.git"


@pytest.mark.parametrize(
    "host,group",
    [(None, None), ("", ""), ("  ", None)],
    ids=["unset", "empty", "blank"],
)
def test_both_left_out_means_no_projects(settings, host, group):
    """Unset or empty keys mean accounts and tokens only."""
    settings(host, group)

    assert read_templates() == ({}, "")


@pytest.mark.parametrize(
    "host,group,errors",
    [
        ("https://gitlab.com", "dtaas.git", [GROUP_ERROR]),
        ("gitlab.com", "dtaas", [HOST_ERROR]),
        ("https://gitlab.com", None, [TOGETHER]),
        (None, "dtaas", [TOGETHER]),
        ("ftp://x", "-bad", [GROUP_ERROR, HOST_ERROR]),
    ],
    ids=["bad-group", "bad-host", "host-only", "group-only", "both-bad"],
)
def test_invalid_settings_are_refused(settings, host, group, errors):
    """Each problem is named, in one sentence each, without a semicolon."""
    settings(host, group)

    urls, error = read_templates()

    assert urls == {}
    assert error == (f"Invalid settings in config/services.env: {'. '.join(errors)}.")
    assert ";" not in error
