"""Tests for the template repositories of a user's projects (templates.py)."""

import pytest
from gitlab_common import (
    PROJECT_TEMPLATES,
    TemplateKeys,
    template_errors,
    template_urls,
)

KEYS = TemplateKeys("HOST_KEY", "GROUP_KEY")
GROUP_ERROR = "GROUP_KEY must be a GitLab group path, such as dtaas or dtaas/templates"
HOST_ERROR = "HOST_KEY must be an https URL, such as https://gitlab.com"
TOGETHER = "GROUP_KEY and HOST_KEY must both be set, or both left out"


def test_each_project_has_its_template():
    """'common' comes from the group's 'common', 'user' from its 'user1'."""
    assert PROJECT_TEMPLATES == {"common": "common", "user": "user1"}


@pytest.mark.parametrize(
    "host,group,base",
    [
        ("https://gitlab.com", "dtaas", "https://gitlab.com/dtaas"),
        ("https://gitlab.com/", "dtaas", "https://gitlab.com/dtaas"),
        (
            "https://git.example.org:8443/gitlab",
            "org/templates",
            "https://git.example.org:8443/gitlab/org/templates",
        ),
    ],
    ids=["default", "trailing-slash", "subgroup-on-a-path"],
)
def test_template_urls_are_built_from_host_and_group(host, group, base):
    """<host>/<group>/<repository>.git, a trailing slash on the host dropped."""
    assert template_urls(host, group) == {
        "common": f"{base}/common.git",
        "user": f"{base}/user1.git",
    }


@pytest.mark.parametrize(
    "host,group,errors",
    [
        ("https://gitlab.com", "dtaas", []),
        (None, None, []),
        ("https://gitlab.com", "dtaas.git", [GROUP_ERROR]),
        ("gitlab.com", "dtaas", [HOST_ERROR]),
        ("http://gitlab.com", "dtaas", [HOST_ERROR]),
        ("https://gitlab.com", "..", [GROUP_ERROR]),
        ("", "", [GROUP_ERROR, HOST_ERROR]),
        ("https://gitlab.com", None, [TOGETHER]),
        (None, "-dtaas", [GROUP_ERROR, TOGETHER]),
    ],
    ids=[
        "valid",
        "both-unset",
        "bad-group",
        "bad-host",
        "plain-http",
        "dot-dot-group",
        "both-empty",
        "host-only",
        "bad-group-only",
    ],
)
def test_template_errors_name_each_problem_with_the_consumers_keys(host, group, errors):
    """A value that is set must pass its rule (an empty one does not, nor
    plain http, nor a group path leaving the group), the two keys go
    together, and each message names the consumer's key."""
    assert template_errors(host, group, KEYS) == errors
