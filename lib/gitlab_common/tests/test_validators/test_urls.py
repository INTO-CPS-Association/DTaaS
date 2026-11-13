"""Tests for is_http_url and is_https_url (gitlab_common/validators.py)."""

import pytest
from gitlab_common import is_http_url, is_https_url

URL_CHECKS = pytest.mark.parametrize(
    "check", [is_http_url, is_https_url], ids=["http-or-https", "https-only"]
)


@URL_CHECKS
@pytest.mark.parametrize(
    "value",
    [
        "https://gitlab.com",
        "https://git.example.org:8443/gitlab/",
        "HTTPS://GitLab.COM/a_b/c~d",
    ],
    ids=["host", "port-and-path", "upper-case"],
)
def test_an_https_url_is_accepted(check, value):
    """https, a host, an optional port and an optional path."""
    assert check(value)


def test_plain_http_is_an_http_url_but_not_an_https_url():
    """is_https_url is is_http_url without plain http."""
    assert is_http_url("http://git.example.org:8080/gitlab/")
    assert not is_https_url("http://git.example.org:8080/gitlab/")


@URL_CHECKS
@pytest.mark.parametrize(
    "value",
    [
        "",
        "gitlab.com",
        "ftp://gitlab.com",
        "git@gitlab.com:dtaas",
        "https://gitlab.com/a b",
        "https://user:pw@gitlab.com",
        "https://gitlab.com\n",
        "https://" + "a" * 20000 + "!",
        None,
    ],
    ids=[
        "empty",
        "no-scheme",
        "ftp",
        "ssh",
        "space",
        "credentials",
        "newline",
        "long-hostile",
        "not-a-string",
    ],
)
def test_anything_but_a_url_is_refused(check, value):
    """Other schemes, credentials in the URL, and a very long value are
    refused at once (the pattern is linear)."""
    assert not check(value)
