"""ThingsBoard credential file processing for customer user creation."""

# pylint: disable=W1203
import csv
import logging
from typing import Tuple
from pathlib import Path
import httpx
from .customer_user import CustomerUserContext, create_customer_and_user
from .tb_cert import (
    CredentialProcessContext,
    validate_credential_row,
)

logger = logging.getLogger(__name__)


def _process_credentials_row(
    ctx: CredentialProcessContext, credential: dict
) -> Tuple[bool, str]:
    """Process a single credential row to create a customer user."""
    username = credential["username"]
    password = credential["password"]

    # Validate email field and check for duplicates
    success, result = validate_credential_row(credential, username, ctx.seen_emails)
    if not success:
        return False, result

    email = result
    ctx.seen_emails.add(email)

    logger.info(f"\nProcessing user '{username}'...")
    user_ctx = CustomerUserContext(ctx.base_url, ctx.session, username)
    user_ctx.user_email = email
    user_ctx.user_password = password
    success, error_msg = create_customer_and_user(user_ctx)

    return (
        (False, f"Failed for user {username}: {error_msg}")
        if not success
        else (True, "")
    )


def _has_required_credentials_columns(credentials: csv.DictReader) -> bool:
    """Return True when required credential columns are present."""
    return bool(credentials.fieldnames and "email" in credentials.fieldnames)


def _process_all_credentials_rows(
    credentials: csv.DictReader, ctx: CredentialProcessContext
) -> Tuple[bool, str]:
    """Process all credential rows and stop on first failure."""
    for credential in credentials:
        success, error_msg = _process_credentials_row(ctx, credential)
        if not success:
            return False, error_msg
    return True, "All users processed successfully"


def _read_and_process_credentials(
    creds_file, ctx: CredentialProcessContext
) -> Tuple[bool, str]:
    """Validate columns and process credentials from an open CSV file."""
    credentials = csv.DictReader(creds_file, delimiter=",")
    if not _has_required_credentials_columns(credentials):
        return False, "Email column is required in credentials.csv"
    return _process_all_credentials_rows(credentials, ctx)


def process_credentials_file(
    base_url: str, session: httpx.Client, credentials_file: Path
) -> Tuple[bool, str]:
    """Process credentials file and create customer users."""
    ctx = CredentialProcessContext(base_url, session)
    with credentials_file.open(mode="r", newline="", encoding="utf-8") as creds_file:
        success, error_msg = _read_and_process_credentials(creds_file, ctx)
        if not success:
            return False, error_msg
    return True, "ThingsBoard customer users created successfully"
