"""Reads the users.csv file behind 'dtaas user add --file'.

Split out of registry.py, which owns dtaas.users.registry.json: parsing an
admin's CSV and storing the registry are separate concerns, and the store had
grown past this package's file size limit. The two halves of a row are read
by separate functions on purpose: the details that are persisted, and the
optional password column, which is transient and must never reach the
registry file.
"""

import csv


def _parse_load_balance(value):
    """Parse a true/false load_balance cell; reject other non-empty values.

    An empty cell defaults to False; any value other than true/false is
    rejected so a typo never silently provisions with unintended settings.
    """
    text = value.strip().lower()
    if text in ("", "false"):
        return False
    if text == "true":
        return True
    raise ValueError(f"Invalid load_balance '{value}': expected 'true' or 'false'.")


def _parse_csv_row(row):
    """Convert one users.csv row into (username, details).

    'groups' is a ';'-separated cell (each tag stripped; an empty cell defaults
    to ['additional']) and 'load_balance' must be a true/false string.
    """
    groups = [g.strip() for g in row.get("groups", "").split(";") if g.strip()]
    details = {
        "email": row.get("email", "").strip(),
        "groups": groups or ["additional"],
        "load_balance": _parse_load_balance(row.get("load_balance", "")),
        "desired_status": "running",
    }
    return row["username"].strip(), details


def read_csv_users(csv_path):
    """Return {username: details} parsed from a users CSV file.

    Raises ValueError if the same username appears in more than one row, so a
    duplicate can never silently overwrite an earlier row's details.
    """
    users = {}
    with open(csv_path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            username, details = _parse_csv_row(row)
            if username in users:
                raise ValueError(f"Duplicate username '{username}' in {csv_path}")
            users[username] = details
    return users


def read_csv_passwords(csv_path):
    """Return {username: password} parsed from a users CSV file's optional
    'password' column, for GitLab provisioning.

    A blank or missing password cell is omitted rather than stored as an
    empty string. Kept independent of read_csv_users so a password can never
    be accidentally merged into the registry-persisted user details --
    passwords are transient and must never reach dtaas.users.registry.json.
    """
    passwords = {}
    with open(csv_path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            username = row.get("username", "").strip()
            password = row.get("password", "").strip()
            if username and password:
                passwords[username] = password
    return passwords
