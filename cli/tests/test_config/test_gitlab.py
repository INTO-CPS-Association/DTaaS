"""Tests for Config: the [gitlab] provisioning settings."""

import pytest
from src.pkg import config
from src.pkg.config import Config


def test_get_gitlab_provision_defaults_to_false(mock_utils):
    """get_gitlab_provision returns False when [gitlab] is absent."""
    mock_utils.return_value = ({"common": {}}, None)
    cfg = config.Config()
    provision, err = cfg.get_gitlab_provision()
    assert provision is False
    assert err is None


def test_get_gitlab_api_url_success(mock_utils):
    """get_gitlab_api_url reads the configured URL."""
    mock_utils.return_value = (
        {"gitlab": {"api_url": "https://gitlab.example.com"}},
        None,
    )
    cfg = config.Config()
    api_url, err = cfg.get_gitlab_api_url()
    assert api_url == "https://gitlab.example.com"
    assert err is None


def test_get_gitlab_api_url_missing_errors(mock_utils):
    """get_gitlab_api_url errors when unset, so provisioning fails loudly."""
    mock_utils.return_value = ({"gitlab": {}}, None)
    cfg = config.Config()
    api_url, err = cfg.get_gitlab_api_url()
    assert api_url is None
    assert err is not None


def test_get_gitlab_pat_reads_config_value(mock_utils):
    """get_gitlab_pat reads [gitlab].pat when present."""
    mock_utils.return_value = ({"gitlab": {"pat": "glpat-abc"}}, None)
    cfg = config.Config()
    pat, err = cfg.get_gitlab_pat()
    assert pat == "glpat-abc"
    assert err is None


def test_get_gitlab_ssl_verify_reads_false(mock_utils):
    """get_gitlab_ssl_verify reads an explicit false value."""
    mock_utils.return_value = ({"gitlab": {"ssl_verify": False}}, None)
    cfg = config.Config()
    ssl_verify, err = cfg.get_gitlab_ssl_verify()
    assert ssl_verify is False
    assert err is None


def test_get_gitlab_ssl_verify_reads_ca_bundle_path_unchanged(mock_utils):
    """A non-empty ssl_verify string (a CA bundle path) passes through as-is
    instead of being coerced to True by bool()."""
    mock_utils.return_value = (
        {"gitlab": {"ssl_verify": "/etc/ssl/certs/corp-ca.pem"}},
        None,
    )
    cfg = config.Config()
    ssl_verify, err = cfg.get_gitlab_ssl_verify()
    assert ssl_verify == "/etc/ssl/certs/corp-ca.pem"
    assert err is None


def test_get_gitlab_section_when_data_is_none():
    """get_gitlab_section propagates the 'Config not initialised' error."""
    cfg = Config.__new__(Config)
    cfg.data = None
    section, err = cfg.get_gitlab_section()
    assert section is None
    assert err is not None


def test_get_gitlab_provision_propagates_section_error(mock_utils):
    """get_gitlab_provision returns the error from get_gitlab_section."""
    mock_utils.return_value = ({"gitlab": "not-a-dict"}, None)
    cfg = config.Config()
    provision, err = cfg.get_gitlab_provision()
    assert provision is False
    assert err is not None


def test_get_gitlab_api_url_propagates_section_error(mock_utils):
    """get_gitlab_api_url returns the error from get_gitlab_section."""
    mock_utils.return_value = ({"gitlab": "not-a-dict"}, None)
    cfg = config.Config()
    api_url, err = cfg.get_gitlab_api_url()
    assert api_url is None
    assert err is not None


def test_get_gitlab_pat_propagates_section_error(mock_utils):
    """get_gitlab_pat returns the error from get_gitlab_section."""
    mock_utils.return_value = ({"gitlab": "not-a-dict"}, None)
    cfg = config.Config()
    pat, err = cfg.get_gitlab_pat()
    assert pat == ""
    assert err is not None


def test_get_gitlab_ssl_verify_propagates_section_error(mock_utils):
    """get_gitlab_ssl_verify returns the error from get_gitlab_section."""
    mock_utils.return_value = ({"gitlab": "not-a-dict"}, None)
    cfg = config.Config()
    ssl_verify, err = cfg.get_gitlab_ssl_verify()
    assert ssl_verify is True
    assert err is not None


COMMON_TEMPLATE = "https://gitlab.com/dtaas/common.git"
USER_TEMPLATE = "https://gitlab.com/dtaas/user1.git"


@pytest.mark.parametrize(
    "gitlab,expected",
    [
        (
            {"common_template": COMMON_TEMPLATE, "user_template": USER_TEMPLATE},
            {"common": COMMON_TEMPLATE, "user": USER_TEMPLATE},
        ),
        ({"provision": True}, {}),
    ],
    ids=["both-set", "both-left-out"],
)
def test_get_gitlab_templates_maps_project_to_template(mock_utils, gitlab, expected):
    """Both keys give one template per project, in project order; neither
    gives none, which means accounts and tokens only."""
    mock_utils.return_value = ({"gitlab": gitlab}, None)
    templates, err = config.Config().get_gitlab_templates()
    assert err is None
    assert templates == expected
    assert list(templates) == list(expected)


@pytest.mark.parametrize(
    "gitlab,message",
    [
        ({"common_template": COMMON_TEMPLATE}, "must both be set"),
        ({"user_template": USER_TEMPLATE}, "must both be set"),
        (
            {
                "common_template": "git@gitlab.com:dtaas/common.git",
                "user_template": USER_TEMPLATE,
            },
            "gitlab.common_template must be a valid URL",
        ),
        ({"common_template": COMMON_TEMPLATE, "user_template": ""}, "user_template"),
    ],
    ids=["common-only", "user-only", "ssh-url", "empty"],
)
def test_get_gitlab_templates_rejects_what_validate_rejects(
    mock_utils, gitlab, message
):
    """'user add' does not run 'config validate', so the getter refuses the
    same settings: one key alone, or a value that is not an http(s) URL."""
    mock_utils.return_value = ({"gitlab": gitlab}, None)
    templates, err = config.Config().get_gitlab_templates()
    assert templates == {}
    assert message in str(err)


def test_get_gitlab_templates_propagates_section_error(mock_utils):
    """get_gitlab_templates returns the error from get_gitlab_section."""
    mock_utils.return_value = ({"gitlab": "not-a-dict"}, None)
    templates, err = config.Config().get_gitlab_templates()
    assert templates == {}
    assert err is not None
