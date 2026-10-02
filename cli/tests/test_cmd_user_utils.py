"""Tests for the user-input resolution/validation helpers in cmd_user_utils.py."""

import click
import pytest
from src.cmd_user_utils import (
    UserAddInput,
    _starting_usernames,
    _users_from_args,
    _users_to_add,
    reject_starting_users,
    resolve_usernames,
    stage_users_for_add,
)
from src.pkg.registry import (
    load_registry,
    load_starting_gitlab,
    set_gitlab_pat_issued,
)
# pylint: disable=protected-access


def test_stage_users_rejects_username_and_file(tmp_path):
    """Passing both a USERNAME and --file is rejected."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@intocps.org\n")
    csv_path = str(csv)
    user_input = UserAddInput("alice", csv_path, None, (), True)
    with pytest.raises(click.ClickException, match="either a USERNAME or --file"):
        stage_users_for_add(user_input)


def test_stage_single_user_requires_email():
    """A single-user add without --email is rejected."""
    user_input = UserAddInput("alice", None, None, (), True)
    with pytest.raises(click.ClickException, match="--email"):
        stage_users_for_add(user_input)


def test_stage_single_user_password_returned_for_added_user(tmp_path, monkeypatch):
    """A single-user add with --password returns it, keyed by username, for
    GitLab provisioning -- and never inside the registry-persisted details."""
    monkeypatch.chdir(tmp_path)
    staged = stage_users_for_add(
        UserAddInput("alice", None, "a@intocps.org", (), True, "S3cur3-p4ss")
    )

    assert staged.added == ["alice"]
    assert staged.passwords == {"alice": "S3cur3-p4ss"}
    store = load_registry()
    assert "password" not in store["alice"]


def test_stage_returns_only_newly_added(tmp_path, monkeypatch):
    """stage_users_for_add returns just the new users, not skipped duplicates,
    but still names the skipped user for GitLab with no password: that is
    the project-only retry, which needs none."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))

    staged = stage_users_for_add(
        UserAddInput("alice", None, "a@intocps.org", (), True)
    )

    assert not staged.added
    assert staged.passwords == {"alice": None}


def test_stage_returns_password_for_already_registered_retry(tmp_path, monkeypatch):
    """Naming an already-registered user again with --password still returns
    their password -- the explicit retry path for a user whose GitLab PAT
    issuance failed on a prior run (add_users targets every username with a
    supplied password, not just newly-added ones)."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@intocps.org", (), True))

    staged = stage_users_for_add(
        UserAddInput("alice", None, "a@intocps.org", (), True, "S3cur3-p4ss")
    )

    assert not staged.added  # already registered: skipped, not re-added
    assert staged.passwords == {"alice": "S3cur3-p4ss"}


def test_stage_rejects_invalid_username(tmp_path, monkeypatch):
    """A shell-unsafe username is rejected before registration."""
    monkeypatch.chdir(tmp_path)
    user_input = UserAddInput("bad;rm", None, "a@intocps.org", (), True)
    with pytest.raises(click.ClickException, match="Invalid username"):
        stage_users_for_add(user_input)


def test_stage_rejects_bare_add(tmp_path, monkeypatch):
    """A bare add (no USERNAME, no --file) is rejected with a helpful message."""
    monkeypatch.chdir(tmp_path)
    user_input = UserAddInput(None, None, None, (), True)
    with pytest.raises(click.ClickException, match="Provide a USERNAME"):
        stage_users_for_add(user_input)

    assert load_registry() == {}


def test_starting_usernames_returns_empty_on_config_error(tmp_path, monkeypatch):
    """_starting_usernames returns [] when get_starting_users errors, rather than
    propagating a malformed dtaas.toml error."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text('[users]\nadd = ["user1"]\n')

    assert _starting_usernames() == []


def test_users_to_add_returns_empty_without_username_or_file():
    """_users_to_add returns {} when given neither a CSV file nor a username."""
    assert not _users_to_add(UserAddInput(None, None, None, (), True), {})


def test_users_from_args_requires_email_for_a_new_user():
    """A user who is not declared in dtaas.toml has no email to fall back on."""
    user_input = UserAddInput("alice", None, None, (), True)

    with pytest.raises(click.ClickException, match="Provide --email"):
        _users_from_args(user_input, {})


def test_users_from_args_takes_a_starting_users_email_from_dtaas_toml():
    """A starting user's email is declared in dtaas.toml, and that is the
    address GitLab provisioning uses, so --email is not required for them:
    'user add foo' used to be refused without an --email it then ignored."""
    user_input = UserAddInput("foo", None, None, (), True)

    named = _users_from_args(user_input, {"foo": "foo@intocps.org"})

    assert named["foo"]["email"] == "foo@intocps.org"


def test_users_from_args_prefers_dtaas_toml_over_email_for_a_starting_user():
    """dtaas.toml stays the one source for a starting user's email, so a
    stale --email cannot provision a GitLab account at another address."""
    user_input = UserAddInput("foo", None, "stale@elsewhere.io", (), True)

    named = _users_from_args(user_input, {"foo": "foo@intocps.org"})

    assert named["foo"]["email"] == "foo@intocps.org"


def test_resolve_usernames_from_positional_args():
    """Positional usernames are returned as-is (as a list)."""
    assert resolve_usernames(("alice", "bob"), None) == ["alice", "bob"]


def test_resolve_usernames_from_csv(tmp_path):
    """--file resolves to the usernames parsed from the CSV, ignoring other columns."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@x.io\nbob,b@x.io\n")

    assert resolve_usernames((), str(csv)) == ["alice", "bob"]


def test_resolve_usernames_rejects_both(tmp_path):
    """Passing both positional usernames and --file is rejected."""
    csv = tmp_path / "u.csv"
    csv.write_text("username,email\nalice,a@x.io\n")
    csv_file = str(csv)

    with pytest.raises(click.ClickException, match="either USERNAMES or --file"):
        resolve_usernames(("alice",), csv_file)


def test_resolve_usernames_rejects_neither():
    """Passing neither positional usernames nor --file is rejected."""
    with pytest.raises(click.ClickException, match="Provide one or more USERNAMES"):
        resolve_usernames((), None)


def test_reject_starting_users_rejects_overlap(tmp_path, monkeypatch):
    """Targeting a dtaas.toml starting user is rejected with a clear error."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text('[[users]]\nusername="alice"\n')

    with pytest.raises(click.ClickException, match="Cannot pause starting user"):
        reject_starting_users(["alice", "bob"], "pause")


def _toml_with_starting_user(tmp_path, password=""):
    """A dtaas.toml whose single starting user optionally carries a password."""
    line = f'\npassword="{password}"' if password else ""
    (tmp_path / "dtaas.toml").write_text(
        f'[[users]]\nusername="foo"\nemail="foo@intocps.org"{line}\n',
        encoding="utf-8",
    )


def test_stage_reports_a_starting_user_as_one(tmp_path, monkeypatch, capsys):
    """A dtaas.toml starting user is not a registry user, so it is reported
    as what it is rather than as a duplicate, and is never registered."""
    monkeypatch.chdir(tmp_path)
    _toml_with_starting_user(tmp_path)

    staged = stage_users_for_add(UserAddInput("foo", None, None, (), True))

    assert staged.added == []
    assert staged.starting == ["foo"]
    assert load_registry() == {}
    assert "starting user" in capsys.readouterr().out


def test_stage_tracks_a_provisioned_starting_user_apart(tmp_path, monkeypatch):
    """With provisioning on, a named starting user gets a marker record of its
    own, so its GitLab halves can be retried without it ever becoming a
    registry user (which would duplicate its container)."""
    monkeypatch.chdir(tmp_path)
    _toml_with_starting_user(tmp_path, password="S3cur3-p4ss")

    staged = stage_users_for_add(UserAddInput("foo", None, None, (), True), True)

    assert staged.passwords == {"foo": "S3cur3-p4ss"}
    assert load_registry() == {}
    assert load_starting_gitlab() == {"foo": {}}


def test_stage_refuses_a_provisioning_run_with_no_password(tmp_path, monkeypatch):
    """A new user with no password has no GitLab half to do, so the run is
    refused before anything is staged: the users.csv the CLI generates has an
    empty password column, and a bulk add from it used to report success
    while provisioning no account and no repositories."""
    monkeypatch.chdir(tmp_path)
    csv_file = tmp_path / "users.csv"
    csv_file.write_text(
        "username,email,groups,load_balance,password\nalice,a@x.io,g,true,\n",
        encoding="utf-8",
    )

    user_input = UserAddInput(None, str(csv_file), None, (), True)

    with pytest.raises(click.ClickException, match="No GitLab password for 'alice'"):
        stage_users_for_add(user_input, True)

    assert load_registry() == {}


def test_stage_allows_no_password_once_the_account_exists(tmp_path, monkeypatch):
    """The documented project-only retry: a user whose token was issued is
    named again with no password and the run goes ahead."""
    monkeypatch.chdir(tmp_path)
    stage_users_for_add(UserAddInput("alice", None, "a@x.io", (), True, "S3cur3-p4ss"))
    set_gitlab_pat_issued(["alice"])

    staged = stage_users_for_add(UserAddInput("alice", None, "a@x.io", (), True), True)

    assert staged.passwords == {"alice": None}
