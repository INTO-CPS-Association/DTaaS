"""Tests for a user's GitLab project provisioning (pkg/gitlab/projects.py)."""

from unittest.mock import MagicMock, patch
import pytest
from src.gitlab_common import (
    IMPORT_TIMEOUT_MINUTES,
    MESSAGE_FAILURE,
    MESSAGE_WARNING,
    ProjectMessage,
    ProjectTemplates,
)
from src.pkg.gitlab.projects import (
    ProjectTarget,
    provision_user_projects,
    resolve_templates,
)

# pylint: disable=redefined-outer-name

USERNAME = "alice"
USER_ID = 7
TEMPLATE_VALUES = {
    "common_template": "https://gitlab.com/dtaas/common.git",
    "user_template": "https://gitlab.com/dtaas/user1.git",
}
TEMPLATES = ProjectTemplates(
    TEMPLATE_VALUES["common_template"],
    TEMPLATE_VALUES["user_template"],
)


@pytest.fixture
def mock_pair():
    """Patch the shared project pair, which gitlab_common owns and tests."""
    with patch(
        "src.pkg.gitlab.projects.ensure_user_projects", return_value=(True, ())
    ) as mock:
        yield mock


def test_provision_user_projects_uses_a_known_id(mock_pair, capsys):
    """A known account id is used directly, with no lookup."""
    with patch("src.pkg.gitlab.projects.find_user_id") as mock_find:
        ok = provision_user_projects(
            MagicMock(), ProjectTarget(USERNAME, USER_ID), TEMPLATES
        )
    assert ok is True
    mock_find.assert_not_called()
    assert mock_pair.call_args.args[1] == USER_ID
    assert "GitLab projects ready for 'alice'" in capsys.readouterr().out


def test_provision_user_projects_looks_up_an_unknown_id(mock_pair, capsys):
    """An id missing from the registry is resolved by username, and said so
    without claiming whose account it is: an account this CLI created before
    its id was recorded looks exactly the same from here."""
    with patch("src.pkg.gitlab.projects.find_user_id", return_value=99):
        ok = provision_user_projects(
            MagicMock(), ProjectTarget(USERNAME), TEMPLATES
        )
    assert ok is True
    assert mock_pair.call_args.args[1] == 99
    out = capsys.readouterr().out
    assert "resolved by username" in out
    assert "not created by this CLI" not in out


@pytest.mark.parametrize(
    "level,expect_prefix",
    [(MESSAGE_WARNING, True), (MESSAGE_FAILURE, False)],
)
def test_provision_user_projects_labels_messages_by_level(
    mock_pair, capsys, level, expect_prefix
):
    """An existing project is a warning the admin should see, a failed one is
    not softened into one: the level decides, never the text."""
    mock_pair.return_value = (True, (ProjectMessage(level, "project 'common' x"),))
    provision_user_projects(MagicMock(), ProjectTarget(USERNAME, USER_ID), TEMPLATES)
    out = capsys.readouterr().out
    assert ("Warning: GitLab projects for 'alice'" in out) is expect_prefix
    assert "project 'common' x" in out


def test_provision_user_projects_without_an_id_fails(mock_pair, capsys):
    """An unresolvable account is a failure, not a silent skip."""
    with patch("src.pkg.gitlab.projects.find_user_id", return_value=None):
        ok = provision_user_projects(
            MagicMock(), ProjectTarget(USERNAME), TEMPLATES
        )
    assert ok is False
    mock_pair.assert_not_called()
    assert "could not be resolved" in capsys.readouterr().out


def _config(values=None, err=None, timeout=(None, None)):
    """A config object returning one get_gitlab_templates outcome, and the
    optional import_timeout that rides along with it."""
    config_obj = MagicMock()
    config_obj.get_gitlab_templates.return_value = (values, err)
    config_obj.get_gitlab_import_timeout.return_value = timeout
    return config_obj


def test_resolve_templates_reads_both_keys():
    """The [gitlab] template keys become the settings the project calls take."""
    templates, err = resolve_templates(_config(dict(TEMPLATE_VALUES)))
    assert err == ""
    assert templates == TEMPLATES


def test_resolve_templates_carries_the_import_budget():
    """[gitlab].import_timeout rides along with the template, so an operator
    can cap a wait that would otherwise hold the run for ten minutes."""
    config_obj = _config(dict(TEMPLATE_VALUES), timeout=(3, None))
    templates, err = resolve_templates(config_obj)
    assert err == ""
    assert templates.import_timeout == 3


def test_resolve_templates_without_a_budget_keeps_the_default():
    """The key is optional: unset leaves gitlab_common's own default."""
    templates, _err = resolve_templates(_config(dict(TEMPLATE_VALUES)))
    assert templates.import_timeout == IMPORT_TIMEOUT_MINUTES


def test_resolve_templates_reports_a_bad_import_budget(capsys):
    """A template that is fine but a budget that is not still fails the
    users it affects, the same way a half configured template does."""
    config_obj = _config(
        dict(TEMPLATE_VALUES), timeout=(None, Exception("import_timeout must be"))
    )
    templates, err = resolve_templates(config_obj)
    assert templates is None
    assert "import_timeout" in err
    assert "failed" in capsys.readouterr().out


def test_resolve_templates_treats_no_template_as_an_opt_out(capsys):
    """A dtaas.toml predating the feature keeps working: a notice, no error."""
    templates, err = resolve_templates(_config())
    assert (templates, err) == (None, "")
    assert "skipped" in capsys.readouterr().out


def test_resolve_templates_reports_a_half_configured_block(capsys):
    """Some keys set is a typo rather than an opt out, so it is an error the
    caller fails the affected users with, not a silent skip."""
    templates, err = resolve_templates(_config(err=Exception("also set gitlab.x")))
    assert templates is None
    assert "also set gitlab.x" in err
    assert "failed" in capsys.readouterr().out
