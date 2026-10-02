"""Tests for the users.csv reader behind 'user add --file'."""

import pytest
from src.pkg.registry_csv import (
    read_csv_passwords,
    read_csv_users,
    _parse_csv_row,
)

# pylint: disable=protected-access

USERS_CSV = (
    "username,email,groups,load_balance\n"
    "alice,alice@intocps.org,additional,true\n"
    "bob,bob@intocps.org,additional;beta-testers,false\n"
)


def test_parse_csv_row_rejects_invalid_load_balance():
    """A load_balance value that is neither true nor false is rejected."""
    with pytest.raises(ValueError, match="load_balance"):
        _parse_csv_row(
            {"username": "x", "email": "x@y.io", "groups": "", "load_balance": "yes"}
        )


def test_read_csv_users_parses_all_rows(tmp_path):
    """read_csv_users turns every CSV row into a {username: details} entry."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(USERS_CSV, encoding="utf-8")

    users = read_csv_users(str(csv_path))

    assert set(users) == {"alice", "bob"}
    assert users["alice"]["load_balance"] is True
    assert users["bob"]["groups"] == ["additional", "beta-testers"]


def test_read_csv_users_rejects_duplicate_username(tmp_path):
    """A username repeated in the CSV is rejected rather than silently overwritten."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(
        "username,email,groups,load_balance\n"
        "alice,alice@intocps.org,additional,true\n"
        "alice,other@intocps.org,additional,false\n",
        encoding="utf-8",
    )
    csv_file = str(csv_path)

    with pytest.raises(ValueError, match="Duplicate username 'alice'"):
        read_csv_users(csv_file)


def test_read_csv_users_ignores_the_password_column(tmp_path):
    """A password cell never reaches the registry-persisted user details."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(
        "username,email,groups,load_balance,password\n"
        "alice,alice@intocps.org,additional,true,S3cur3-p4ss\n",
        encoding="utf-8",
    )

    details = read_csv_users(str(csv_path))["alice"]

    assert "password" not in details
    assert "S3cur3-p4ss" not in str(details)


def test_read_csv_passwords_parses_password_column(tmp_path):
    """read_csv_passwords extracts {username: password} for GitLab provisioning."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(
        "username,email,groups,load_balance,password\n"
        "alice,alice@intocps.org,additional,true,S3cur3-p4ss\n"
        "bob,bob@intocps.org,additional,false,An0ther-p4ss\n",
        encoding="utf-8",
    )

    passwords = read_csv_passwords(str(csv_path))

    assert passwords == {"alice": "S3cur3-p4ss", "bob": "An0ther-p4ss"}


def test_read_csv_passwords_omits_blank_and_missing_cells(tmp_path):
    """The template's empty password column yields no passwords at all, which
    is what 'user add' refuses the run over."""
    csv_path = tmp_path / "users.csv"
    csv_path.write_text(
        "username,email,groups,load_balance,password\n"
        "alice,alice@intocps.org,additional,true,\n"
        "bob,bob@intocps.org,additional,false,  \n",
        encoding="utf-8",
    )

    assert read_csv_passwords(str(csv_path)) == {}
