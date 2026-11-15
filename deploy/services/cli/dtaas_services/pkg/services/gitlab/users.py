"""GitLab user management via the python-gitlab library.

'user add -s gitlab' runs two steps. The account step (accounts.py) creates
an account and a Personal Access Token for each row of
config/credentials.csv, and the new tokens are merged into
config/gitlab_user_tokens.json, so the tokens saved by earlier runs are
kept. The project step (user_projects.py) then gives those users their
projects, when config/services.env names the templates
(project_templates.py).

Before any user is touched, the template settings are checked, and the two
files the run saves to (gitlab_user_tokens.json and
gitlab_user_projects.json) are read and written back: a token issued but
not saved would be a valid credential that nobody holds.
"""

import csv
import logging
from pathlib import Path
from typing import Tuple

from ...config import Config
from ...utils import get_credentials_path
from ._api import get_gitlab_client
from .accounts import AccountRun, create_account
from .personal_token import _load_pat_from_tokens
from .project_report import say
from .project_state import get_projects_path, read_records
from .project_templates import read_templates
from .tokens_file import (
    get_user_tokens_path,
    merge_json_object,
    merge_tokens,
    read_saved_tokens,
)
from .user_projects import Account, ProjectRun, ProjectTally, provision_projects

logger = logging.getLogger(__name__)


def _process_user_row(run: AccountRun, row: dict, accounts: list[Account]) -> str:
    """Create the account and PAT of one row, keep its account when one is
    in place: "" or the row's error."""
    success, error_msg, account = create_account(run, row)
    if account is not None:
        accounts.append(account)
    return "" if success else error_msg


def _report_row_error(errors: list[str], row: dict, error_msg: str) -> None:
    """Print a failed row as it happens, with why below it (GitLab's own
    words for a refused account), and collect it for the result message.

    Args:
        errors: List to append the error to
        row: CSV row dict
        error_msg: Error message from processing
    """
    username = (row.get("username") or "").strip() or "<unknown>"
    say("red", f"GitLab account '{username}' failed.", error_msg)
    errors.append(f"{username}: {error_msg}")


def _create_users_from_rows(run: AccountRun, reader) -> Tuple[bool, str, list[Account]]:
    """Create GitLab users and PATs for each row yielded by a CSV DictReader.

    Processes every row regardless of individual failures so that successful
    tokens are never lost. Each failed row is printed as it happens, and the
    errors are also returned as a newline-joined summary.

    Args:
        run: The admin client, saved tokens and records of this run
        reader: csv.DictReader iterator with username/email/password columns

    Returns:
        Tuple of (all_succeeded, error_summary_or_empty, accounts in place)
    """
    accounts: list[Account] = []
    errors: list[str] = []
    for row in reader:
        error_msg = _process_user_row(run, row, accounts)
        if error_msg:
            _report_row_error(errors, row, error_msg)
    return (False, "\n".join(errors), accounts) if errors else (True, "", accounts)


def _finalize_user_tokens(
    accounts: list[Account], error_summary: str = ""
) -> Tuple[bool, str]:
    """Merge the tokens this run issued *accounts* (if any) into the token
    file and build the final status message: (success, message).

    Tokens are persisted even when some rows failed so that already-created
    PATs are not lost, and merged so that the tokens of earlier runs stay. A
    token file that cannot be read is never overwritten.
    """
    tokens = {account.username: account.token for account in accounts if account.token}
    save_msg = ""
    if tokens:
        save_ok, save_msg = merge_tokens(tokens, get_user_tokens_path())
        if not save_ok:
            return False, save_msg
        save_msg = f" {save_msg}"

    if error_summary:
        base = f"GitLab users partially created.{save_msg}"
        return False, f"{base}\nErrors:\n{error_summary}"

    return True, f"GitLab users created successfully.{save_msg}".rstrip(".")


def _process_credentials(
    run: AccountRun, creds_path: Path
) -> Tuple[bool, str, list[Account]]:
    """Read credentials.csv and create a GitLab user and PAT for each row.

    Args:
        run: The admin client, saved tokens and records of this run
        creds_path: Path to the credentials CSV file

    Returns:
        Tuple of (success, error_message, accounts in place)
    """
    try:
        with creds_path.open("r", newline="", encoding="utf-8") as fh:
            return _create_users_from_rows(run, csv.DictReader(fh, delimiter=","))
    except (OSError, KeyError, ValueError) as exc:
        return False, f"Error reading credentials file: {exc}", []


def _load_gitlab_prerequisites() -> Tuple[bool, str, Path]:
    """Load the PAT and locate the credentials file.

    Returns:
        Tuple of (success, pat_or_error, creds_path)
    """
    success, pat = _load_pat_from_tokens()
    if not success:
        return False, pat, Path()

    creds_path = get_credentials_path()
    if not creds_path.exists():
        return False, f"Credentials file not found: {creds_path}", Path()

    return True, pat, creds_path


def _user_files() -> Tuple[tuple[dict, dict] | None, str]:
    """The saved user tokens and the records, once both files are known to
    be readable and writable: each is read and written back unchanged (and
    made, when missing). ((tokens, records), "") or (None, why not)."""
    for path in (get_user_tokens_path(), get_projects_path()):
        try:
            merge_json_object(path, {})
        except (OSError, ValueError) as exc:
            return None, f"config/{path.name} cannot be used: {exc}"
    saved, _ = read_saved_tokens(get_user_tokens_path())
    records, _ = read_records()
    return (saved, records), ""


def _with_projects(result: Tuple[bool, str], tally: ProjectTally) -> Tuple[bool, str]:
    """Add the project step's summary to the account step's *result*, on its
    first line, the one the 'user add' summary prints. A failed project
    fails the GitLab step."""
    success, message = result
    summary = tally.summary()
    if not summary:
        return success, message
    first, newline, rest = message.partition("\n")
    return (
        success and not tally.failed,
        f"{first.rstrip('.')}. {summary}{newline}{rest}",
    )


def setup_gitlab_users() -> Tuple[bool, str]:
    """Add users to GitLab from the credentials CSV, create their PATs, then
    their projects when config/services.env names the templates.

    The template settings and the user files are checked before any user
    is touched.

    Returns:
        Tuple of (success, message)
    """
    Config()
    success, pat_or_error, creds_path = _load_gitlab_prerequisites()
    if not success:
        return False, pat_or_error
    templates, error = read_templates()
    files, files_error = _user_files() if not error else (None, "")
    if files is None:
        return False, error or files_error
    gl = get_gitlab_client(pat_or_error)
    _, error_msg, accounts = _process_credentials(AccountRun(gl, *files), creds_path)
    result = _finalize_user_tokens(accounts, error_msg)
    run = ProjectRun(gl, templates, get_user_tokens_path())
    return _with_projects(result, provision_projects(run, accounts))
