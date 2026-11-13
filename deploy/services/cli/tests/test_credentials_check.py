"""Tests for the check of config/credentials.csv made once by 'user add'
(credentials_check.py)."""

import pytest
from dtaas_services.pkg.credentials_check import duplicate_username_error

HEADER = "username,password,email\n"


def _csv(tmp_path, body, header=HEADER):
    """A credentials file with *header* and *body*, in tmp_path."""
    path = tmp_path / "credentials.csv"
    path.write_text(header + body, encoding="utf-8", newline="\n")
    return path


@pytest.mark.parametrize(
    "body,header",
    [
        ("alice,pw,a@x.io\nbob,pw,b@x.io\n", HEADER),
        ("alice,pw,a@x.io\nalice2,pw,b@x.io\n", HEADER),
        (",pw,a@x.io\n,pw,b@x.io\n", HEADER),
        ("", HEADER),
        ("alice,pw\nalice,pw\n", "name,password\n"),
    ],
    ids=["unique", "similar-names", "empty-usernames", "no-rows", "no-username-column"],
)
def test_a_file_with_each_user_once_passes(tmp_path, body, header):
    """Different names pass, even similar ones. A row with no username, or
    a file with no username column, is left to each service to report."""
    assert duplicate_username_error(_csv(tmp_path, body, header)) == ""


@pytest.mark.parametrize(
    "repeat", ["alice", "Alice", " ALICE "], ids=["same", "other-case", "spaces"]
)
def test_a_username_listed_twice_is_named_with_both_lines(tmp_path, repeat):
    """A repeat, also in another case or with spaces around it (GitLab
    ignores case in usernames), names the name as the second row spells it
    and both lines of the file."""
    path = _csv(tmp_path, f"alice,pw,a@x.io\nbob,pw,b@x.io\n{repeat},pw,c@x.io\n")

    assert duplicate_username_error(path) == (
        f"config/credentials.csv lists the username '{repeat.strip()}' on line 2 "
        "and again on line 4 (usernames are compared ignoring case, as GitLab "
        "does). Remove one of the two rows, then run the command again."
    )


def test_no_file_is_left_to_the_services(tmp_path):
    """Each service reports a missing credentials file itself."""
    assert duplicate_username_error(tmp_path / "credentials.csv") == ""


def test_a_file_that_cannot_be_read_is_named(tmp_path):
    """A file that is not UTF-8 stops the command once, with why."""
    path = tmp_path / "credentials.csv"
    path.write_bytes(HEADER.encode() + b"al\xffce,pw,a@x.io\n")

    error = duplicate_username_error(path)

    assert error.startswith("config/credentials.csv cannot be read: ")
    assert "utf-8" in error
