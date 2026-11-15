"""Tests for config/gitlab_user_projects.json, the users' records: the
GitLab account each belongs to, whether this CLI made it, and the finished
projects (project_state.py)."""

import json
from pathlib import Path

import pytest
from dtaas_services.pkg.services.gitlab import project_state, tokens_file
from dtaas_services.pkg.services.gitlab.project_state import UserRecord
from tests.test_services.test_gitlab.conftest import write_text
# pylint: disable=W0621

CREATED_AT = "2026-11-10T09:14:31.123Z"
ALICE = UserRecord(5, CREATED_AT, created=True, projects=("common",))
SAVED_ALICE = {
    "id": 5,
    "created_at": CREATED_AT,
    "created": True,
    "projects": ["common"],
}


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
def test_a_missing_file_has_no_record():
    """Before the first account, there is no record."""
    assert project_state.read_records() == ({}, "")


def test_a_record_is_read_as_saved(projects_path):
    """A saved record reads back whole, project names that are not text
    dropped."""
    write_text(
        projects_path,
        json.dumps({"alice": {**SAVED_ALICE, "projects": ["common", 3]}}),
    )
    assert project_state.read_records() == ({"alice": ALICE}, "")


@pytest.mark.parametrize(
    "entry",
    [
        ["common", "user"],
        "common user",
        None,
        {**SAVED_ALICE, "id": "5"},
        {**SAVED_ALICE, "id": True},
        {**SAVED_ALICE, "created_at": ""},
        {**SAVED_ALICE, "created": "yes"},
        {**SAVED_ALICE, "projects": "common"},
        {key: value for key, value in SAVED_ALICE.items() if key != "id"},
    ],
    ids=[
        "list-of-an-earlier-version",
        "text",
        "null",
        "id-as-text",
        "id-as-bool",
        "no-creation-time",
        "created-not-a-bool",
        "projects-not-a-list",
        "no-id",
    ],
)
def test_an_entry_that_is_not_a_record_belongs_to_no_account(projects_path, entry):
    """A hand edit, or the plain list an unreleased version saved, never
    makes a project look finished, nor an account look made by this CLI."""
    write_text(projects_path, json.dumps({"alice": entry, "bob": SAVED_ALICE}))
    assert project_state.read_records() == ({"bob": ALICE}, "")


def test_a_record_belongs_to_its_account_only():
    """The same id with another creation time is another account: a
    reinstalled GitLab gives out the same ids again."""
    assert ALICE.belongs_to(5, CREATED_AT)
    assert not ALICE.belongs_to(5, "2026-12-01T08:00:00.000Z")
    assert not ALICE.belongs_to(6, CREATED_AT)


@pytest.mark.parametrize("content", ["{not json", "[1]"])
def test_an_unreadable_file_is_reported(projects_path, content):
    """A file that is not a JSON object gives an error naming it."""
    write_text(projects_path, content)
    records, error = project_state.read_records()
    assert records == {}
    assert error.startswith("config/gitlab_user_projects.json cannot be read: ")


def test_a_saved_record_replaces_the_users_and_keeps_the_others(projects_path):
    """Saving one user's record replaces their older one and leaves everyone
    else's as it was, and the file is created on the first save."""
    bob = UserRecord(9, CREATED_AT)
    assert project_state.save_record("alice", UserRecord(5, "old", True)) == ""
    assert project_state.save_record("bob", bob) == ""
    assert project_state.save_record("alice", ALICE) == ""
    assert json.loads(projects_path.read_text(encoding="utf-8")) == {
        "alice": SAVED_ALICE,
        "bob": {"id": 9, "created_at": CREATED_AT, "created": False, "projects": []},
    }


def test_a_record_never_overwrites_an_unreadable_file(projects_path):
    """A broken file is reported and left for the admin to look at."""
    write_text(projects_path, "{not json")
    error = project_state.save_record("alice", ALICE)
    assert error.startswith("config/gitlab_user_projects.json cannot be written: ")
    assert projects_path.read_text(encoding="utf-8") == "{not json"
