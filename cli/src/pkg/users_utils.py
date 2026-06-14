"""Helper utilities for user management."""

import re
import click
from pathlib import Path

CONF_SERVER_PATH = Path("config") / "conf.server"


def _next_rule_num(text):
    """Return the next available onlyu<N> index from existing conf.server content."""
    nums = [int(m) for m in re.findall(r"rule\.onlyu(\d+)\.", text)]
    return max(nums, default=0) + 1


def _conf_server_block(username, email, rule_num):
    """Return the 3-line conf.server block for one user."""
    return (
        f"\nrule.onlyu{rule_num}.action=auth\n"
        f"rule.onlyu{rule_num}.rule=PathPrefix(`/{username}`)\n"
        f"rule.onlyu{rule_num}.whitelist={email}\n"
    )


def add_conf_server_entry(username, email):
    """Append routing and whitelist rules for username to config/conf.server.

    Skipped silently when conf.server does not exist or email is empty.
    """
    if not CONF_SERVER_PATH.is_file() or not email:
        return
    text = CONF_SERVER_PATH.read_text(encoding="utf-8")
    rule_num = _next_rule_num(text)
    CONF_SERVER_PATH.write_text(
        text + _conf_server_block(username, email, rule_num), encoding="utf-8"
    )


def remove_conf_server_entry(username):
    """Remove routing and whitelist rules for username from config/conf.server.

    Skipped silently when conf.server does not exist or the user has no rules.
    """
    if not CONF_SERVER_PATH.is_file():
        return
    text = CONF_SERVER_PATH.read_text(encoding="utf-8")
    rule_nums = re.findall(
        rf"rule\.onlyu(\d+)\.rule=PathPrefix\(`/{re.escape(username)}`\)", text
    )
    if not rule_nums:
        return
    for num in rule_nums:
        block_pat = re.compile(
            rf"\nrule\.onlyu{num}\.action=[^\n]*\n"
            rf"rule\.onlyu{num}\.rule=[^\n]*\n"
            rf"rule\.onlyu{num}\.whitelist=[^\n]*\n"
        )
        text = block_pat.sub("", text)
    CONF_SERVER_PATH.write_text(text, encoding="utf-8")


def categorize_users(user_list, existing_services):
    """Categorize users into existing and missing.

    Args:
        user_list: List of usernames to categorize
        existing_services: Dict of existing services

    Returns:
        Tuple of (existing list, missing list)
    """
    existing, missing = [], []
    for username in user_list:
        if username in existing_services:
            existing.append(username)
        else:
            missing.append(username)
    return existing, missing


def report_missing_users(missing):
    """Report users that don't exist.

    Args:
        missing: List of usernames that don't exist
    """
    for username in missing:
        click.echo(f"'{username}' does not exist, skipping deletion")


def remove_users_from_compose(compose, user_list):
    """Remove users from compose configuration."""
    for username in user_list:
        if "services" in compose and username in compose["services"]:
            del compose["services"][username]
