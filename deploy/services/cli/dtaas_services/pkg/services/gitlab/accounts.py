"""The account step of 'dtaas-services user add -s gitlab': an account and a
Personal Access Token for each row of config/credentials.csv.

A new account is recorded in config/gitlab_user_projects.json as made by
this CLI, with its id and creation time, the moment it exists and before
its token is issued (project_state.py). That record replaces whatever an
earlier account of the same name left there. An account that existed before
the run gets no token: this CLI never issues one for an account it did not
create. The one exception is an account it did create, in an earlier run,
with no token saved for it (the token could not be issued or saved, or the
admin removed it): when GitLab still has that very account (same id and
creation time) and it is no administrator, its 'dtaas' tokens are revoked,
so a lost one is never left valid, and a new one is issued.
"""

from dataclasses import dataclass, field
from typing import Tuple

import gitlab

from ....gitlab_common import (
    CreateOutcome,
    PatOptions,
    UserInfo,
    create_user,
    create_user_pat,
    find_user,
    revoke_user_pats,
)
from .project_report import RERUN, say
from .project_state import UserRecord, save_record
from .user_projects import Account

USER_PAT_OPTIONS = PatOptions(scopes=("api", "read_repository", "write_repository"))

# One row's outcome: (success, error, the account in place, or None).
RowResult = Tuple[bool, str, Account | None]


@dataclass(frozen=True)
class AccountRun:
    """One run's admin client, the user tokens saved before it, and the
    records of config/gitlab_user_projects.json."""

    gl: gitlab.Gitlab
    saved: dict = field(repr=False)
    records: dict[str, UserRecord] = field(default_factory=dict)


def _row_fields(row: dict) -> dict[str, str]:
    """The username, email and password of a CSV row, trimmed."""
    keys = ("username", "email", "password")
    return {key: (row.get(key) or "").strip() for key in keys}


def _new_account(run: AccountRun, username: str, info: UserInfo) -> RowResult:
    """Record the account this run created as made by this CLI, then issue
    its token. A failed token can be issued by the next run, once the
    record is saved."""
    record = UserRecord(info.user_id, info.created_at, created=True)
    record_error = save_record(username, record)
    issued, token_or_error = create_user_pat(
        run.gl, info.user_id, username, USER_PAT_OPTIONS
    )
    if issued:
        account = Account(username, info.user_id, token_or_error, info.created_at)
        return not record_error, record_error, account
    if record_error:
        return False, f"{record_error} {token_or_error}.", None
    return False, f"{token_or_error}. The next '{RERUN}' issues one again.", None


def _replace_token(run: AccountRun, username: str, info: UserInfo) -> RowResult:
    """Revoke the 'dtaas' tokens of the account *info* (an earlier run
    issued them, and none is saved), then issue a new one."""
    revoked, error = revoke_user_pats(run.gl, info.user_id)
    if not revoked:
        return False, f"{error}. No new token was issued.", None
    issued, token_or_error = create_user_pat(
        run.gl, info.user_id, username, USER_PAT_OPTIONS
    )
    if not issued:
        return False, token_or_error, None
    say(
        "green",
        f"✅ GitLab token issued again for '{username}'.",
        "This CLI created the account, and no token of it was saved.",
    )
    return True, "", Account(username, info.user_id, token_or_error, info.created_at)


def _created_here(
    run: AccountRun, username: str, record: UserRecord
) -> Tuple[UserInfo | None, str]:
    """The account named *username* when it is the one this CLI created, as
    *record* says, and no administrator: (info, ""). (None, "") when the
    name belongs to another account now, (None, why) when it cannot be
    told."""
    info, error = find_user(run.gl, username)
    if info is not None and info.is_admin:
        return None, f"{username} is a GitLab administrator, so no token is issued."
    if info is None or record.belongs_to(info.user_id, info.created_at):
        return info, error
    return None, ""


def _has_saved_token(run: AccountRun, username: str) -> bool:
    """True when a token is saved for *username*."""
    saved = run.saved.get(username)
    return isinstance(saved, str) and bool(saved)


def _record_to_reissue(run: AccountRun, username: str) -> UserRecord | None:
    """*username*'s record when it says this CLI created the account and no
    token of it is saved, else None."""
    record = run.records.get(username)
    if record is None or not record.created or _has_saved_token(run, username):
        return None
    return record


def _existing_account(run: AccountRun, username: str) -> RowResult:
    """An account that was there before this run, as it is, unless this CLI
    created it and no token of it is saved: its token is then issued again.
    When the name belongs to another account now, it is handed on as it is."""
    record = _record_to_reissue(run, username)
    if record is None:
        return True, "", Account(username)
    info, error = _created_here(run, username, record)
    if info is None:
        return not error, error, None if error else Account(username)
    return _replace_token(run, username, info)


def create_account(run: AccountRun, row: dict) -> RowResult:
    """Create the account of one CSV row and its token.

    Returns:
        Tuple of (success, error, account): the account is None when none is
        in place for the project step. It carries its id, token and creation
        time when this run created it or issued its token.
    """
    fields = _row_fields(row)
    result = create_user(run.gl, **fields)
    if result.outcome is CreateOutcome.FAILED:
        return False, result.error, None
    if result.user_id is None:
        return _existing_account(run, fields["username"])
    info = UserInfo(result.user_id, result.created_at)
    return _new_account(run, fields["username"], info)
