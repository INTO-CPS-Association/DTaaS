"""Tests for the GitLab JSON files under config/ (tokens_file.py)."""

import json
from pathlib import Path
import pytest
from dtaas_services.pkg.services.gitlab import tokens_file
from dtaas_services.pkg.utils import permission_hint
from tests.conftest import denied
from tests.test_services.test_gitlab.conftest import TEST_TOKEN, write_text
# pylint: disable=W0621

SAVED = {"personal_access_token": "old", "server_app": {"client_id": "s"}}


def test_get_tokens_path(mocker):
    """The tokens file lives in the project's config folder"""
    mocker.patch.object(
        tokens_file.Config, "get_base_dir", return_value=Path("/srv/dtaas")
    )
    assert tokens_file.get_tokens_path() == Path("/srv/dtaas/config/gitlab_tokens.json")


def test_merge_tokens_creates_the_file(tokens_path):
    """A first merge creates the file with just the given fields"""
    assert tokens_file.merge_tokens({"personal_access_token": TEST_TOKEN}) == (
        True,
        f"Tokens saved to {tokens_path}",
    )
    assert json.loads(tokens_path.read_text(encoding="utf-8")) == {
        "personal_access_token": TEST_TOKEN
    }


def test_merge_tokens_keeps_saved_entries(tokens_path):
    """Entries not in the merge stay; merged ones replace the saved values"""
    write_text(tokens_path, json.dumps(SAVED))
    tokens_file.merge_tokens({"personal_access_token": TEST_TOKEN, "client_app": {}})
    assert json.loads(tokens_path.read_text(encoding="utf-8")) == {
        "personal_access_token": TEST_TOKEN,
        "server_app": {"client_id": "s"},
        "client_app": {},
    }


@pytest.mark.parametrize("content", ["{not json", "[1]"])
def test_merge_tokens_leaves_an_unreadable_file_alone(tokens_path, content):
    """A file that is not a JSON object is reported, never overwritten"""
    write_text(tokens_path, content)
    success, msg = tokens_file.merge_tokens({"personal_access_token": TEST_TOKEN})
    assert success is False
    assert msg.startswith(f"Failed to save tokens to {tokens_path}")
    assert tokens_path.read_text(encoding="utf-8") == content


@pytest.mark.parametrize(
    "content, expected",
    [(None, ({}, "")), (json.dumps(SAVED), (SAVED, ""))],
)
def test_read_saved_tokens(tokens_path, content, expected):
    """A missing file reads as empty, a saved one as its contents"""
    if content is not None:
        write_text(tokens_path, content)
    assert tokens_file.read_saved_tokens() == expected


def test_read_saved_tokens_unreadable(tokens_path):
    """An unreadable file gives an error naming it"""
    write_text(tokens_path, "{not json")
    data, error = tokens_file.read_saved_tokens()
    assert data == {}
    assert error.startswith(f"Failed to read {tokens_path}")


def test_get_user_tokens_path(mocker):
    """The users' tokens live next to the install secrets"""
    mocker.patch.object(
        tokens_file.Config, "get_base_dir", return_value=Path("/srv/dtaas")
    )
    assert tokens_file.get_user_tokens_path() == Path(
        "/srv/dtaas/config/gitlab_user_tokens.json"
    )


def test_merge_into_another_file_keeps_its_entries(tokens_path):
    """The users' token file is merged the same way: a run that adds a user
    keeps the tokens of the users added before"""
    user_tokens = tokens_path.with_name("gitlab_user_tokens.json")
    write_text(user_tokens, json.dumps({"alice": "old-alice"}))
    assert tokens_file.merge_tokens({"bob": "new-bob"}, user_tokens) == (
        True,
        f"Tokens saved to {user_tokens}",
    )
    assert tokens_file.read_saved_tokens(user_tokens) == (
        {"alice": "old-alice", "bob": "new-bob"},
        "",
    )
    assert not tokens_path.exists()


@pytest.mark.parametrize(
    "call",
    [
        lambda path: tokens_file.read_saved_tokens(path)[1],
        lambda path: tokens_file.merge_tokens({"k": "v"}, path)[1],
    ],
    ids=["read", "merge"],
)
def test_a_file_owned_by_root_reports_the_fix(tmp_path, mocker, call):
    """A token file written as root by 'service install' fails with the fix"""
    path = tmp_path / "gitlab_tokens.json"
    write_text(path, "{}")
    mocker.patch.object(Path, "open", side_effect=denied(path))
    assert call(path).endswith(permission_hint(path))
