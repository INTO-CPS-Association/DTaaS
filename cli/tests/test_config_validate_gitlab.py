"""Tests for the [gitlab] section checks (config_validate_gitlab.py).

Reached through config_validate.collect_errors, the aggregator that lists
every problem at once, so these cover the section as a user meets it.
"""

import copy
import pytest
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


def test_gitlab_template_keys_may_all_be_omitted(base):
    """Leaving the whole template out is a valid choice: 'user add' then
    provisions accounts and tokens without creating any repositories."""
    ok = copy.deepcopy(base)
    ok["gitlab"] = {"provision": True, "api_url": "https://gitlab.example.com"}
    assert collect_errors(ok) == []


@pytest.mark.parametrize("key", ["common_template", "user_template"])
def test_gitlab_template_urls_must_be_urls(base, key):
    """A malformed template URL is caught before 'user add' imports from it,
    for either project's template."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = {key: "gitlab.com/dtaas/common"}
    assert f"gitlab.{key} must be a valid URL" in collect_errors(bad)


def test_gitlab_template_must_be_complete(base):
    """Part of a template is a mistake: it is caught here rather than at
    'user add', and the message names the keys still missing."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = {"common_template": "https://gitlab.com/x/y.git"}
    errors = collect_errors(bad)
    assert [e for e in errors if "gitlab.user_template" in e]


def test_gitlab_template_rejects_a_blank_value(base):
    """A blank value counts as missing, not as an empty override."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = {
        "common_template": "  ",
        "user_template": "https://gitlab.com/x/y.git",
    }
    assert [e for e in collect_errors(bad) if "gitlab.common_template" in e]


@pytest.mark.parametrize("key", ["import_timeout", "import_deadline"])
def test_gitlab_minute_keys_must_be_whole_minutes(base, key):
    """A bad wait budget is caught by 'config validate', like the template
    keys, rather than at 'user add'."""
    bad = copy.deepcopy(base)
    bad["gitlab"] = {key: "ten"}
    assert [e for e in collect_errors(bad) if f"gitlab.{key}" in e]


def test_gitlab_minute_keys_accept_minutes(base):
    """Positive whole minutes validate cleanly on their own: both keys are
    independent of the template keys."""
    ok = copy.deepcopy(base)
    ok["gitlab"] = {"import_timeout": 20, "import_deadline": 90}
    assert collect_errors(ok) == []


def test_gitlab_template_values_accepted(base):
    """A template repository for each of the two projects validates cleanly."""
    ok = copy.deepcopy(base)
    ok["gitlab"] = {
        "common_template": "https://gitlab.example.com/dtaas/common.git",
        "user_template": "https://gitlab.example.com/dtaas/user.git",
    }
    assert collect_errors(ok) == []
