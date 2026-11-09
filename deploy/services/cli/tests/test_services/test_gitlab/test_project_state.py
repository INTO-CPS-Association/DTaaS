"""Tests for config/gitlab_user_projects.json, the finished GitLab projects
(project_state.py)."""

import json
from pathlib import Path

import pytest
from dtaas_services.pkg.services.gitlab import project_state, tokens_file
from tests.test_services.test_gitlab.conftest import write_text
# pylint: disable=W0621


@pytest.fixture
def projects_path(mocker, tmp_path):
    """Put the project base dir, so config/gitlab_user_projects.json, in tmp_path."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    return tmp_path / "config" / "gitlab_user_projects.json"


def test_get_projects_path(mocker):
    """The file lives in the project's config folder."""
    mocker.patch.object(
        tokens_file.Config, "get_base_dir", return_value=Path("/srv/dtaas")
    )
    assert project_state.get_projects_path() == Path(
        "/srv/dtaas/config/gitlab_user_projects.json"
    )


@pytest.mark.usefixtures("projects_path")
def test_a_missing_file_has_nothing_finished():
    """Before the first project, nothing is finished."""
    assert project_state.read_finished() == ({}, "")


def test_entries_that_are_not_lists_of_names_count_as_none(projects_path):
    """A hand edited entry never makes a project look finished by accident."""
    write_text(
        projects_path,
        json.dumps({"alice": ["common", 3], "bob": "common user", "carol": None}),
    )
    assert project_state.read_finished() == ({"alice": ["common"]}, "")


@pytest.mark.parametrize("content", ["{not json", "[1]"])
def test_an_unreadable_file_is_reported(projects_path, content):
    """A file that is not a JSON object gives an error naming it."""
    write_text(projects_path, content)
    finished, error = project_state.read_finished()
    assert finished == {}
    assert error.startswith("config/gitlab_user_projects.json cannot be read: ")


def test_a_record_keeps_the_other_users(projects_path):
    """Recording one user's projects leaves everyone else's as they were,
    and the file is created on the first record."""
    assert project_state.record_finished("alice", ["common"]) == ""
    assert project_state.record_finished("bob", ["common", "user"]) == ""
    assert project_state.record_finished("alice", ["common", "user"]) == ""
    assert json.loads(projects_path.read_text(encoding="utf-8")) == {
        "alice": ["common", "user"],
        "bob": ["common", "user"],
    }


def test_a_record_never_overwrites_an_unreadable_file(projects_path):
    """A broken file is reported and left for the admin to look at."""
    write_text(projects_path, "{not json")
    error = project_state.record_finished("alice", ["common"])
    assert error.startswith("config/gitlab_user_projects.json cannot be written: ")
    assert projects_path.read_text(encoding="utf-8") == "{not json"
