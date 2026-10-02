"""Tests for the GitLab password resolution in cmd_user_passwords.py."""

from unittest.mock import patch
import click
import pytest
from src.cmd_user_passwords import (
    PasswordSources,
    _read_csv_passwords,
    has_account,
    require_passwords,
    resolve_passwords,
)
from src.cmd_user_utils import UserAddInput
from src.pkg.registry import register_new_users, register_starting_users

# pylint: disable=protected-access

NAMED = {"alice": {"email": "a@x.io"}}


def _csv(tmp_path, cells):
    """A one-row users.csv whose password cell is *cells*; returns its path."""
    path = tmp_path / "users.csv"
    path.write_text(
        f"username,email,groups,load_balance,password\nalice,a@x.io,g,true,{cells}\n",
        encoding="utf-8",
    )
    return str(path)


@pytest.mark.parametrize(
    "cell,expected",
    [("S3cur3-p4ss", {"alice": "S3cur3-p4ss"}), ("", {"alice": None})],
)
def test_the_csv_password_column_is_read(tmp_path, cell, expected):
    """A row with a password supplies it; a row without still names its user,
    so the GitLab step runs and retries an existing account's projects."""
    user_input = UserAddInput(None, _csv(tmp_path, cell), None, (), True)

    assert resolve_passwords(PasswordSources(user_input), NAMED, False) == expected


def test_read_csv_passwords_missing_file_raises_click_exception():
    """A missing/unreadable CSV surfaces as a ClickException, not a raw OSError."""
    with pytest.raises(click.ClickException, match="Error importing users file"):
        _read_csv_passwords("does-not-exist.csv")


def test_an_explicit_password_beats_the_configured_one():
    """--password wins over [[users]].password, the usual CLI convention and
    the only way to provision a starting user without editing dtaas.toml."""
    user_input = UserAddInput("alice", None, "a@x.io", (), True, "from-the-flag")
    sources = PasswordSources(user_input, {"alice": "from-dtaas-toml"})

    passwords = resolve_passwords(sources, NAMED, True)

    assert passwords == {"alice": "from-the-flag"}


def test_the_configured_password_is_the_fallback():
    """[[users]].password is used when the run supplies none, and no prompt
    is reached for it."""
    user_input = UserAddInput("alice", None, "a@x.io", (), True)
    sources = PasswordSources(user_input, {"alice": "from-dtaas-toml"})

    with patch("src.cmd_user_passwords._prompt_password") as prompt:
        passwords = resolve_passwords(sources, NAMED, True)

    prompt.assert_not_called()
    assert passwords == {"alice": "from-dtaas-toml"}


def test_a_single_user_add_prompts_when_nothing_supplies_a_password(
    tmp_path, monkeypatch
):
    """The hidden prompt is the last resort, and only for a single-user add."""
    monkeypatch.chdir(tmp_path)
    user_input = UserAddInput("alice", None, "a@x.io", (), True)

    with patch(
        "src.cmd_user_passwords._prompt_password", return_value="typed"
    ) as prompt:
        passwords = resolve_passwords(PasswordSources(user_input), NAMED, True)

    prompt.assert_called_once_with("alice")
    assert passwords == {"alice": "typed"}


def test_no_prompt_without_provisioning(tmp_path, monkeypatch):
    """With [gitlab].provision off nothing reads a password, so none is asked
    for and dtaas.toml is not consulted."""
    monkeypatch.chdir(tmp_path)
    user_input = UserAddInput("alice", None, "a@x.io", (), True)

    with patch("src.cmd_user_passwords._prompt_password") as prompt:
        passwords = resolve_passwords(PasswordSources(user_input), NAMED, False)

    prompt.assert_not_called()
    assert passwords == {"alice": None}


def test_a_csv_add_is_never_prompted_for(tmp_path):
    """A --file import takes its passwords from the CSV: prompting once per
    row would make a bulk add unscriptable."""
    user_input = UserAddInput(None, _csv(tmp_path, ""), None, (), True)

    with patch("src.cmd_user_passwords._prompt_password") as prompt:
        resolve_passwords(PasswordSources(user_input), NAMED, True)

    prompt.assert_not_called()


@pytest.mark.parametrize("marker", ["gitlab_pat_issued", "gitlab_user_id"])
def test_has_account_reads_either_store(tmp_path, monkeypatch, marker):
    """An account from an earlier run is recognised whether the user is an
    additional one or a dtaas.toml starting user."""
    monkeypatch.chdir(tmp_path)
    register_new_users({"alice": {marker: 7}}, [])
    register_starting_users(["foo"])

    assert has_account("alice") is True
    assert has_account("foo") is False
    assert has_account("ghost") is False


def test_require_passwords_names_every_user_it_can_do_nothing_for(
    tmp_path, monkeypatch
):
    """The whole run is refused, naming each user, so one message covers a
    CSV with several password-less rows."""
    monkeypatch.chdir(tmp_path)

    with pytest.raises(click.ClickException) as raised:
        require_passwords({"bob": {}, "alice": {}}, {"alice": None, "bob": None})

    message = str(raised.value)
    assert "'alice', 'bob'" in message
    assert "password" in message


def test_require_passwords_accepts_a_project_only_retry(tmp_path, monkeypatch):
    """A user whose account exists needs no password: that is the retry after
    a project failure."""
    monkeypatch.chdir(tmp_path)
    register_new_users({"alice": {"gitlab_pat_issued": True}}, [])

    require_passwords({"alice": {}}, {"alice": None})


def test_no_prompt_once_the_token_was_issued(tmp_path, monkeypatch):
    """A user whose token was issued only has their projects retried, which
    needs no password, so none is asked for and no second token is minted."""
    monkeypatch.chdir(tmp_path)
    register_new_users({"alice": {"gitlab_pat_issued": True}}, [])
    user_input = UserAddInput("alice", None, "a@x.io", (), True)

    with patch("src.cmd_user_passwords._prompt_password") as prompt:
        passwords = resolve_passwords(PasswordSources(user_input), NAMED, True)

    prompt.assert_not_called()
    assert passwords == {"alice": None}
