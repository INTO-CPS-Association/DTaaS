"""Tests for the GitLab password resolution in cmd_user_passwords.py."""

from unittest.mock import patch
import click
import pytest
from src.cmd_user_passwords import (
    PasswordSources,
    _read_csv_passwords,
    configured_names,
    has_account,
    remind_configured_passwords,
    require_passwords,
    resolve_passwords,
)
from src.cmd_user_utils import UserAddInput
from src.pkg.registry import register_new_users, register_starting_users

# pylint: disable=protected-access,redefined-outer-name

NAMED = {"alice": {"email": "a@x.io"}}


@pytest.fixture(autouse=True)
def file_mode(tmp_path, monkeypatch):
    """Run in a scratch directory and take the POSIX path on every platform,
    with password files at 0600 unless a test says otherwise; returns the
    mock to change the mode."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("src.cmd_user_passwords.IS_WINDOWS", False)
    with patch("src.cmd_user_passwords._file_mode", return_value=0o600) as mode:
        yield mode


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
    so the GitLab step runs and reports an existing account as done."""
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


def test_require_passwords_accepts_a_user_with_an_account(tmp_path, monkeypatch):
    """A user whose account exists needs no password: a re-run has nothing
    left to create for them."""
    monkeypatch.chdir(tmp_path)
    register_new_users({"alice": {"gitlab_pat_issued": True}}, [])

    require_passwords({"alice": {}}, {"alice": None})


def test_no_prompt_once_the_token_was_issued(tmp_path, monkeypatch):
    """A user whose token was already issued has nothing left to create, so
    no password is asked for and no second token is minted."""
    monkeypatch.chdir(tmp_path)
    register_new_users({"alice": {"gitlab_pat_issued": True}}, [])
    user_input = UserAddInput("alice", None, "a@x.io", (), True)

    with patch("src.cmd_user_passwords._prompt_password") as prompt:
        passwords = resolve_passwords(PasswordSources(user_input), NAMED, True)

    prompt.assert_not_called()
    assert passwords == {"alice": None}


def _csv_input(tmp_path):
    """A users.csv add whose row carries a password."""
    return UserAddInput(None, _csv(tmp_path, "S3cur3-p4ss"), None, (), True)


def _toml_input():
    """A single add of a starting user whose password is in dtaas.toml."""
    return UserAddInput("alice", None, "a@x.io", (), True)


MODES = [(0o644, False, True), (0o640, False, True), (0o600, False, False),
         (0o644, True, False)]


@pytest.mark.parametrize(
    "case", [(source, *mode) for source in ("csv", "toml") for mode in MODES]
)
def test_a_password_file_others_can_read_is_warned_about(tmp_path, capsys, case):
    """Plaintext passwords in a file group or others can read are pointed
    out with the fix; Windows mode bits say nothing, so nothing is checked."""
    source, mode, windows, warned = case
    if source == "csv":
        sources = PasswordSources(_csv_input(tmp_path))
    else:
        sources = PasswordSources(_toml_input(), {"alice": "from-dtaas-toml"})

    with patch("src.cmd_user_passwords._file_mode", return_value=mode), patch(
        "src.cmd_user_passwords.IS_WINDOWS", windows
    ):
        resolve_passwords(sources, NAMED, True)

    out = capsys.readouterr().out
    assert ("is readable by other users" in out) is warned
    assert ("chmod 600" in out) is warned


def test_no_warning_when_no_password_is_read_from_a_file(
    tmp_path, capsys, file_mode
):
    """Provisioning off, or no password in the file: nothing is used, so
    nothing is warned about."""
    file_mode.return_value = 0o644

    resolve_passwords(PasswordSources(_csv_input(tmp_path)), NAMED, False)
    resolve_passwords(
        PasswordSources(UserAddInput(None, _csv(tmp_path, ""), None, (), True)),
        NAMED,
        True,
    )

    assert capsys.readouterr().out == ""


@pytest.mark.parametrize("accounts,named", [({"alice": 7}, True), ({}, False)])
def test_the_configured_password_is_pointed_out_once_its_account_exists(
    capsys, accounts, named
):
    """Only users with an account are named: for the others the key is still
    needed to create one."""
    register_new_users(
        {name: {"gitlab_user_id": uid} for name, uid in accounts.items()}, []
    )

    remind_configured_passwords(["alice", "bob"])

    out = capsys.readouterr().out
    assert ("remove [[users]].password from dtaas.toml" in out) is named
    assert ("'alice'" in out) is named
    assert "'bob'" not in out


def test_configured_names_lists_only_users_with_the_key():
    """An empty or missing [[users]].password is not one to remove."""
    sources = PasswordSources(_toml_input(), {"alice": "pw", "bob": ""})

    assert configured_names(sources, ["alice", "bob", "carol"]) == ["alice"]
