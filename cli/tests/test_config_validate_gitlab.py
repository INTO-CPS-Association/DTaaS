"""Tests for the [gitlab] section checks (config_validate_gitlab.py).

Reached through config_validate.collect_errors, the aggregator that lists
every problem at once, so these cover the section as a user meets it.
"""

import copy
from src.pkg.config_validate import collect_errors


def test_gitlab_section_not_a_table(base):
    """[gitlab] must be a table, not a scalar."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = "nope"
    assert "gitlab section is not a table" in collect_errors(bad)


def test_gitlab_provision_requires_valid_api_url(base):
    """provision=true requires a present, valid api_url."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = {"provision": True}
    assert "gitlab.api_url is missing" in collect_errors(bad)

    bad["gitlab"]["api_url"] = "not-a-url"
    assert "gitlab.api_url must be a valid URL" in collect_errors(bad)

    bad["gitlab"]["api_url"] = "https://gitlab.example.com"
    assert collect_errors(bad) == []


def test_gitlab_api_url_optional_when_provision_disabled(base):
    """With provision false (or absent), api_url is not required."""
    ok = copy.deepcopy(base)
    ok["gitlab"] = {"provision": False}
    assert collect_errors(ok) == []


def test_gitlab_empty_pat_rejected(base):
    """A [gitlab].pat key that is present but blank is a config mistake."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = {"pat": "   "}
    assert "gitlab.pat is set but empty: remove it or set a real token" in collect_errors(
        bad
    )


def test_gitlab_ssl_verify_accepts_bool_or_string(base):
    """ssl_verify may be a bool or a CA bundle path string; nothing else."""
    ok = copy.deepcopy(base)
    ok["gitlab"] = {"ssl_verify": "/etc/ssl/certs/corp-ca.pem"}
    assert collect_errors(ok) == []

    bad = copy.deepcopy(base)
    bad["gitlab"] = {"ssl_verify": 1}
    assert (
        "gitlab.ssl_verify must be true, false, or a CA bundle path"
        in collect_errors(bad)
    )


def test_gitlab_provision_must_be_bool(base):
    """provision must be a genuine bool, not a truthy-looking string."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = {"provision": "true"}
    assert "gitlab.provision must be true or false" in collect_errors(bad)


def test_gitlab_provisioning_with_only_an_api_url_validates(base):
    """provision and api_url are all a [gitlab] block needs: the token comes
    from DTAAS_GITLAB_PAT, and ssl_verify defaults to true."""
    ok = copy.deepcopy(base)
    ok["gitlab"] = {"provision": True, "api_url": "https://gitlab.example.com"}
    assert collect_errors(ok) == []
