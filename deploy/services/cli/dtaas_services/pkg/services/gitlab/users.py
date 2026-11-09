"""GitLab user management via the python-gitlab library.

'user add -s gitlab' runs two steps. The account step here creates an
account and a Personal Access Token for each row of config/credentials.csv,
and merges the new tokens into config/gitlab_user_tokens.json, so the tokens
saved by earlier runs are kept. The project step (user_projects.py) then
gives those users their projects, when config/services.env names the
templates (project_templates.py).
"""

import csv
import logging
from pathlib import Path
from typing import Tuple

import gitlab

from ....gitlab_common import CreateOutcome, PatOptions, create_user, create_user_pat
from ...config import Config
from ...utils import get_credentials_path
from ._api import get_gitlab_client
from .personal_token import _load_pat_from_tokens
from .project_templates import read_templates
from .tokens_file import get_user_tokens_path, merge_tokens
from .user_projects import Account, ProjectRun, ProjectTally, provision_projects

logger = logging.getLogger(__name__)

USER_PAT_OPTIONS = PatOptions(scopes=("api", "read_repository", "write_repository"))


def _create_single_user(gl: gitlab.Gitlab, row: dict) -> Tuple[bool, str, int | None]:
    """Create one GitLab user from a CSV row via gitlab_common.create_user.

    Extracts and trims the username/email/password columns, then delegates
    validation and creation to the shared module, mapping its result back to
    this module's (success, error, user_id) contract. A user that already
    exists is reported as success with no id, so no PAT is issued for an
    account this run did not create.

    Args:
        gl: Authenticated gitlab.Gitlab client
        row: Dict with keys 'username', 'email', 'password' from the CSV

    Returns:
        Tuple of (success, error_message, user_id_or_None)
    """
    result = create_user(
        gl,
        username=(row.get("username") or "").strip(),
        email=(row.get("email") or "").strip(),
        password=(row.get("password") or "").strip(),
    )
    if result.outcome is CreateOutcome.FAILED:
        return False, result.error, None
    return True, "", result.user_id


def _issue_pat(
    gl: gitlab.Gitlab, username: str, user_id: int
) -> Tuple[bool, str, Account]:
    """Create the PAT of the account this run created for *username*.

    Returns:
        Tuple of (success, error_msg, account with its id and token)
    """
    success, token_or_error = create_user_pat(gl, user_id, username, USER_PAT_OPTIONS)
    if not success:
        return False, token_or_error, Account(username)
    return True, "", Account(username, user_id, token_or_error)


def _create_user_and_pat(gl: gitlab.Gitlab, row: dict) -> Tuple[bool, str, Account]:
    """Create a user and, if newly created, their Personal Access Token.

    Args:
        gl: Authenticated gitlab.Gitlab client
        row: CSV row dict with username/email/password keys

    Returns:
        Tuple of (success, error_msg, account): the account carries its id
        and token only when this run created it.
    """
    username = (row.get("username") or "").strip()
    success, error, user_id = _create_single_user(gl, row)
    if not success or user_id is None:
        return success, error, Account(username)
    return _issue_pat(gl, username, user_id)


def _process_user_row(
    gl: gitlab.Gitlab, row: dict, accounts: list[Account]
) -> Tuple[bool, str]:
    """Create user/PAT for one row and add its account when it succeeded."""
    success, error_msg, account = _create_user_and_pat(gl, row)
    if success:
        accounts.append(account)
    return success, error_msg


def _collect_user_creation_errors(errors: list[str], row: dict, error_msg: str) -> None:
    """Collect an error with the associated username for reporting.

    Args:
        errors: List to append the error to
        row: CSV row dict
        error_msg: Error message from processing
    """
    username = (row.get("username") or "").strip() or "<unknown>"
    errors.append(f"{username}: {error_msg}")


def _create_users_from_rows(
    gl: gitlab.Gitlab, reader
) -> Tuple[bool, str, list[Account]]:
    """Create GitLab users and PATs for each row yielded by a CSV DictReader.

    Processes every row regardless of individual failures so that successful
    tokens are never lost.  Per-row errors are collected and returned as a
    newline-joined summary.

    Args:
        gl: Authenticated gitlab.Gitlab client
        reader: csv.DictReader iterator with username/email/password columns

    Returns:
        Tuple of (all_succeeded, error_summary_or_empty, accounts in place)
    """
    accounts: list[Account] = []
    errors: list[str] = []
    for row in reader:
        success, error_msg = _process_user_row(gl, row, accounts)
        if not success:
            _collect_user_creation_errors(errors, row, error_msg)
    return (False, "\n".join(errors), accounts) if errors else (True, "", accounts)


def _finalize_user_tokens(
    tokens: dict[str, str], error_summary: str = ""
) -> Tuple[bool, str]:
    """Merge the new user tokens (if any) into the token file and build the
    final status message.

    Tokens are persisted even when some rows failed so that already-created
    PATs are not lost, and merged so that the tokens of earlier runs stay. A
    token file that cannot be read is never overwritten.

    Returns:
        Tuple of (success, message)
    """
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
    gl: gitlab.Gitlab, creds_path: Path
) -> Tuple[bool, str, list[Account]]:
    """Read credentials.csv and create a GitLab user and PAT for each row.

    Args:
        gl: Authenticated gitlab.Gitlab client
        creds_path: Path to the credentials CSV file

    Returns:
        Tuple of (success, error_message, accounts in place)
    """
    try:
        with creds_path.open("r", newline="", encoding="utf-8") as fh:
            return _create_users_from_rows(gl, csv.DictReader(fh, delimiter=","))
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

    The template settings are checked before any user is touched.

    Returns:
        Tuple of (success, message)
    """
    Config()
    success, pat_or_error, creds_path = _load_gitlab_prerequisites()
    if not success:
        return False, pat_or_error
    templates, error = read_templates()
    if error:
        return False, error

    gl = get_gitlab_client(pat_or_error)
    _, error_msg, accounts = _process_credentials(gl, creds_path)
    tokens = {account.username: account.token for account in accounts if account.token}
    result = _finalize_user_tokens(tokens, error_msg)
    run = ProjectRun(gl, templates, get_user_tokens_path())
    return _with_projects(result, provision_projects(run, accounts))
