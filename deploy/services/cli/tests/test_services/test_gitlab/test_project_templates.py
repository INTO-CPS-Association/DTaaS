"""Tests for the template settings of the GitLab project step
(project_templates.py)."""

from pathlib import Path

import pytest
from dotenv import dotenv_values
from dtaas_services.pkg.services.gitlab.project_templates import (
    ProjectTemplate,
    read_templates,
)
# pylint: disable=W0621

TEMPLATE = (
    Path(__file__).resolve().parents[3]
    / "dtaas_services"
    / "templates"
    / "config"
    / "services.env.template"
)
KEYS = (
    "GITLAB_TEMPLATE_HOST",
    "GITLAB_TEMPLATE_GROUP",
    "GITLAB_TEMPLATE_COMMON_COMMIT",
    "GITLAB_TEMPLATE_USER_COMMIT",
)
COMMON_COMMIT = "299d6e62e3addf074b2bbaffe4c5804ee096255c"
USER_COMMIT = "a1d75f4a85221b236ccdc5e9ae7640dc5fb17fcf"
GROUP_ERROR = (
    "GITLAB_TEMPLATE_GROUP must be a GitLab group path, such as dtaas or "
    "dtaas/templates"
)
HOST_ERROR = "GITLAB_TEMPLATE_HOST must be an https URL, such as https://gitlab.com"
TOGETHER = (
    "GITLAB_TEMPLATE_GROUP and GITLAB_TEMPLATE_HOST must both be set, "
    "or both left out"
)
COMMIT_ERROR = (
    "GITLAB_TEMPLATE_USER_COMMIT must be a full commit id (40 hexadecimal "
    "characters)"
)


@pytest.fixture
def settings(monkeypatch):
    """Set the template keys to the given values, in KEYS order: None
    unsets a key, and keys not given are unset."""

    def apply(*values):
        padded = (*values, *(None for _ in KEYS[len(values) :]))
        for key, value in zip(KEYS, padded):
            if value is None:
                monkeypatch.delenv(key, raising=False)
            else:
                monkeypatch.setenv(key, value)

    return apply


def test_the_shipped_template_pins_the_dtaas_templates(settings):
    """A project generated from the template fills its users' projects from
    the dtaas group on gitlab.com, each at its pinned commit."""
    shipped = dotenv_values(TEMPLATE)
    settings(*(shipped[key] for key in KEYS))

    assert read_templates() == (
        {
            "common": ProjectTemplate(
                "https://gitlab.com/dtaas/common.git", COMMON_COMMIT
            ),
            "user": ProjectTemplate("https://gitlab.com/dtaas/user1.git", USER_COMMIT),
        },
        "",
    )


def test_changed_settings_build_the_urls(settings):
    """Another host, with a port and a path, a subgroup, one template pinned
    (in upper case, read as lower case) and one following its default
    branch."""
    settings(
        " https://git.example.org:8443/gitlab/ ",
        "org/templates",
        COMMON_COMMIT.upper(),
        "",
    )

    templates, error = read_templates()

    assert error == ""
    assert templates == {
        "common": ProjectTemplate(
            "https://git.example.org:8443/gitlab/org/templates/common.git",
            COMMON_COMMIT,
        ),
        "user": ProjectTemplate(
            "https://git.example.org:8443/gitlab/org/templates/user1.git"
        ),
    }


@pytest.mark.parametrize(
    "values",
    [(None, None), ("", ""), ("  ", None), (None, None, COMMON_COMMIT, USER_COMMIT)],
    ids=["unset", "empty", "blank", "commits-alone"],
)
def test_without_host_and_group_there_are_no_projects(settings, values):
    """Unset or empty host and group mean accounts and tokens only, pinned
    commits or not."""
    settings(*values)

    assert read_templates() == ({}, "")


@pytest.mark.parametrize(
    "values,errors",
    [
        (("https://gitlab.com", "dtaas.git"), [GROUP_ERROR]),
        (("https://gitlab.com", ".."), [GROUP_ERROR]),
        (("gitlab.com", "dtaas"), [HOST_ERROR]),
        (("http://gitlab.com", "dtaas"), [HOST_ERROR]),
        (("https://gitlab.com", None), [TOGETHER]),
        ((None, "dtaas"), [TOGETHER]),
        (("ftp://x", "-bad"), [GROUP_ERROR, HOST_ERROR]),
        (("https://gitlab.com", "dtaas", None, "main"), [COMMIT_ERROR]),
        (("https://gitlab.com", "dtaas", None, USER_COMMIT[:12]), [COMMIT_ERROR]),
        ((None, None, None, "--all"), [COMMIT_ERROR]),
    ],
    ids=[
        "bad-group",
        "group-leaves-the-group",
        "bad-host",
        "plain-http",
        "host-only",
        "group-only",
        "both-bad",
        "commit-is-a-branch",
        "commit-shortened",
        "bad-commit-alone",
    ],
)
def test_invalid_settings_are_refused(settings, values, errors):
    """Each problem is named, in one sentence each, without a semicolon. A
    pinned commit must be a full commit id, even when it is not used."""
    settings(*values)

    templates, error = read_templates()

    assert templates == {}
    assert error == (f"Invalid settings in config/services.env: {'. '.join(errors)}.")
    assert ";" not in error
