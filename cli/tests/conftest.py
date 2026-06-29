"""Shared test fixtures and constants."""

CONF_SERVER_CONTENT = (
    "rule.libms.action=auth\n"
    "rule.libms.rule=PathPrefix(`/lib`)\n"
    "\n"
    "rule.onlyu1.action=auth\n"
    "rule.onlyu1.rule=PathPrefix(`/user1`)\n"
    "rule.onlyu1.whitelist=user1@example.com\n"
    "\n"
    "rule.onlyu2.action=auth\n"
    "rule.onlyu2.rule=PathPrefix(`/user2`)\n"
    "rule.onlyu2.whitelist=user2@example.com\n"
)
