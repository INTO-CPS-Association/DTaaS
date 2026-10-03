"""Tests for persisting GitLab provisioning outcomes (users_gitlab_records.py)."""

import json
from types import SimpleNamespace
from unittest.mock import patch
from src.pkg import users_gitlab_records
# pylint: disable=protected-access


def test_save_gitlab_tokens_keeps_superseded_entry_rather_than_overwriting(
    tmp_path, monkeypatch, capsys
):
    """If the tokens file already holds a different token for a user, the old
    value is retained under a timestamped key (and a warning printed) instead
    of being silently dropped."""
    monkeypatch.chdir(tmp_path)
    tokens_file = tmp_path / "gitlab_user_tokens.json"
    tokens_file.write_text('{"alice": "glpat-old"}', encoding="utf-8")

    users_gitlab_records._save_gitlab_tokens({"alice": "glpat-new"})

    saved = json.loads(tokens_file.read_text(encoding="utf-8"))
    assert saved["alice"] == "glpat-new"
    superseded = [k for k in saved if k.startswith("alice (superseded ")]
    assert len(superseded) == 1
    assert saved[superseded[0]] == "glpat-old"
    assert "revoked manually" in capsys.readouterr().out


def test_an_account_is_reported_once_its_token_is_on_disk(
    tmp_path, monkeypatch, capsys
):
    """A run that creates an account and then fails on its projects read as a
    total failure, with nothing saying a live token had just been issued."""
    monkeypatch.chdir(tmp_path)
    result = SimpleNamespace(username="alice", new_id=42, token="glpat-new")

    with patch("src.pkg.users_gitlab_records.set_gitlab_user_ids"), patch(
        "src.pkg.users_gitlab_records.set_gitlab_pat_issued"
    ):
        users_gitlab_records.persist_account_result(result)

    out = capsys.readouterr().out
    assert "GitLab account and token created for 'alice'" in out
    assert "gitlab_user_tokens.json" in out


def test_nothing_is_reported_when_no_token_was_issued(tmp_path, monkeypatch, capsys):
    """An account step that issued no token (an account that already existed,
    or a skip) must not claim one was created."""
    monkeypatch.chdir(tmp_path)
    result = SimpleNamespace(username="alice", new_id=None, token="")

    users_gitlab_records.persist_account_result(result)

    assert capsys.readouterr().out == ""


def test_release_forgets_nothing_for_a_user_with_no_gitlab_record(
    tmp_path, monkeypatch
):
    """A deployment that never provisioned GitLab keeps its token file as it
    is, so an unrelated user's token is not dropped by someone else's delete."""
    monkeypatch.chdir(tmp_path)
    tokens = tmp_path / "gitlab_user_tokens.json"
    tokens.write_text('{"other": "glpat-keep"}', encoding="utf-8")

    users_gitlab_records.release_gitlab_records(
        {"alice": {"email": "a@x.io"}}, ["alice"]
    )

    assert json.loads(tokens.read_text(encoding="utf-8")) == {"other": "glpat-keep"}
