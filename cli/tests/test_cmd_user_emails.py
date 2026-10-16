"""Tests for the unused-email report (cmd_user_emails.py)."""

from src.cmd_user_emails import unused_emails, warn_unused_emails

STARTING = {"foo": "foo@intocps.org"}


def test_a_starting_users_other_email_is_named():
    """dtaas.toml owns a starting user's email, so an --email or a users.csv
    column naming another address is not applied, and saying so is the only
    way an admin finds out before GitLab does."""
    named = {"foo": {"email": "stale@elsewhere.io"}}

    assert unused_emails(named, STARTING) == ["foo"]


def test_the_declared_email_is_not_reported():
    """Leaving --email out, or giving the declared address, asks for nothing
    the run does not do."""
    named = {"foo": {"email": "foo@intocps.org"}}

    assert unused_emails(named, STARTING) == []


def test_a_user_who_is_not_a_starting_user_is_not_reported():
    """Their email is the one the run applies, whatever it is."""
    named = {"alice": {"email": "alice@intocps.org"}}

    assert unused_emails(named, STARTING) == []


def test_the_warning_names_the_declared_address(capsys):
    """The report has to say which address is used, or it only puzzles."""
    warn_unused_emails({"foo": {"email": "stale@elsewhere.io"}}, STARTING)

    assert "foo@intocps.org" in capsys.readouterr().out
