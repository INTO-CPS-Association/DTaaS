"""Tests for persisting GitLab provisioning outcomes (users_gitlab_records.py)."""

import json
from types import SimpleNamespace
from unittest.mock import patch
import pytest
from src.pkg import users_gitlab_records
# pylint: disable=protected-access,redefined-outer-name,unused-argument

TRACKED = {"alice": {"gitlab_user_id": 42, "gitlab_pat_issued": True}}


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
    assert "revoke it there" in capsys.readouterr().out


@pytest.mark.parametrize(
    "new_id,line",
    [
        (42, "GitLab account and token created for 'alice'"),
        (None, "GitLab token issued for 'alice'"),
    ],
)
def test_an_account_is_reported_once_its_token_is_on_disk(
    capsys, token_file, new_id, line
):
    """A run that creates an account and then fails later used to read as a
    total failure, with nothing saying a live token had just been issued. A
    retry (no new account id) reports the token alone."""
    result = SimpleNamespace(username="alice", new_id=new_id, token="glpat-new")

    with patch("src.pkg.users_gitlab_records.set_gitlab_user_ids"), patch(
        "src.pkg.users_gitlab_records.set_gitlab_pat_issued"
    ):
        users_gitlab_records.persist_account_result(result)

    out = capsys.readouterr().out
    assert line in out
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


@pytest.fixture
def token_file(tmp_path, monkeypatch):
    """A credentials file holding alice's token and an unrelated one."""
    monkeypatch.chdir(tmp_path)
    tokens = tmp_path / "gitlab_user_tokens.json"
    tokens.write_text('{"alice": "glpat-live", "other": "glpat-keep"}', encoding="utf-8")
    return tokens


@pytest.fixture
def gitlab_api():
    """The GitLab glue a release calls, revoking successfully by default."""
    with patch("src.pkg.users_gitlab_records.Config"), patch(
        "src.pkg.users_gitlab_records.gitlabPkg"
    ) as api:
        api.resolve_client.return_value = ("gl", None)
        api.revoke_issued_tokens.return_value = (True, "")
        yield api


def _saved(token_file):
    """The credentials file as a dict."""
    return json.loads(token_file.read_text(encoding="utf-8"))


def test_release_revokes_then_drops_only_that_users_token(
    token_file, gitlab_api, capsys
):
    """The token goes on GitLab first, then from the file; the account stays."""
    assert users_gitlab_records.release_gitlab_records(TRACKED, ["alice"]) == []

    gitlab_api.revoke_issued_tokens.assert_called_once_with("gl", 42)
    assert _saved(token_file) == {"other": "glpat-keep"}
    out = capsys.readouterr().out
    assert "GitLab token revoked for 'alice'" in out
    assert "The GitLab account stays" in out


def test_release_keeps_a_token_gitlab_refused_to_revoke(
    token_file, gitlab_api, capsys
):
    """A token still valid on GitLab keeps its saved copy, and is named."""
    gitlab_api.revoke_issued_tokens.return_value = (False, "403 Forbidden")

    failed = users_gitlab_records.release_gitlab_records(TRACKED, ["alice"])

    assert failed == ["alice"]
    assert _saved(token_file)["alice"] == "glpat-live"
    out = capsys.readouterr().out
    assert "GitLab token not revoked for 'alice'" in out
    assert "403 Forbidden" in out
    assert "still valid" in out


def test_release_without_an_account_id_revokes_nothing(token_file, gitlab_api):
    """A token marker with no account id cannot be revoked by this CLI."""
    failed = users_gitlab_records.release_gitlab_records(
        {"alice": {"gitlab_pat_issued": True}}, ["alice"]
    )

    assert failed == ["alice"]
    gitlab_api.revoke_issued_tokens.assert_not_called()
    assert "alice" in _saved(token_file)


@pytest.mark.parametrize("no_config", [False, True])
def test_release_without_a_client_keeps_every_token(
    token_file, gitlab_api, no_config, capsys
):
    """No dtaas.toml or no admin token: every tracked user is reported."""
    gitlab_api.resolve_client.return_value = (None, Exception("No GitLab PAT"))
    with patch(
        "src.pkg.users_gitlab_records.Config",
        side_effect=RuntimeError("config initialisation failed") if no_config else None,
    ):
        failed = users_gitlab_records.release_gitlab_records(TRACKED, ["alice"])

    assert failed == ["alice"]
    gitlab_api.revoke_issued_tokens.assert_not_called()
    assert "alice" in _saved(token_file)
    assert "GitLab token not revoked for 'alice'" in capsys.readouterr().out


def test_revoke_failure_exc_names_the_users():
    """No failure is no error; a failure names every user left behind."""
    assert users_gitlab_records.revoke_failure_exc([]) is None
    err = users_gitlab_records.revoke_failure_exc(["alice", "bob"])
    assert "GitLab tokens not revoked for: alice, bob" in str(err)


def test_check_token_file_clears_a_stale_tmp_and_keeps_the_tokens(
    token_file, capsys
):
    """A temp file an interrupted save left behind no longer blocks saves."""
    stale = token_file.with_suffix(".json.tmp")
    stale.write_text('{"alice": "glpat-li', encoding="utf-8")

    assert users_gitlab_records.check_token_file() is None

    assert not stale.exists()
    assert _saved(token_file) == {"alice": "glpat-live", "other": "glpat-keep"}
    assert "removed a leftover gitlab_user_tokens.json.tmp" in capsys.readouterr().out


def test_check_token_file_passes_with_no_file_yet(tmp_path, monkeypatch):
    """A first run starts from an empty token file."""
    monkeypatch.chdir(tmp_path)

    assert users_gitlab_records.check_token_file() is None
    assert _saved(tmp_path / "gitlab_user_tokens.json") == {}


@pytest.mark.parametrize("content", ['{"alice": "glpat-li', '["glpat-x"]'])
def test_check_token_file_refuses_a_file_it_cannot_read(token_file, content):
    """A corrupt file is reported and left as it is for the admin to fix."""
    token_file.write_text(content, encoding="utf-8")

    err = users_gitlab_records.check_token_file()

    assert "gitlab_user_tokens.json cannot be used" in str(err)
    assert token_file.read_text(encoding="utf-8") == content


def test_check_token_file_refuses_a_file_it_cannot_write(token_file):
    """A file that cannot be written is reported before any token exists."""
    with patch(
        "src.pkg.users_gitlab_records.utils.write_secret_file",
        side_effect=PermissionError("denied"),
    ):
        err = users_gitlab_records.check_token_file()

    assert "denied" in str(err)


def test_release_warns_when_a_revoked_token_stays_listed(
    token_file, gitlab_api, capsys
):
    """The token is revoked, so a file that cannot be updated is only a
    warning: the delete does not fail over a dead credential."""
    token_file.write_text('{"alice": "glpat-li', encoding="utf-8")

    assert users_gitlab_records.release_gitlab_records(TRACKED, ["alice"]) == []

    out = capsys.readouterr().out
    assert "GitLab token revoked for 'alice'" in out
    assert "gitlab_user_tokens.json was not updated" in out
