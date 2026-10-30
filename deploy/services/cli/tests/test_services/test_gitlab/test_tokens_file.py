"""Tests for reading and merging config/gitlab_tokens.json (tokens_file.py)."""

import json
from pathlib import Path
import pytest
from dtaas_services.pkg.services.gitlab import tokens_file
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
