import re

# For users.py
COMPOSE_USERS_YML = "compose.users.yml"

# A safe username: alphanumeric plus . _ - only, so it never carries shell
# metacharacters, whitespace, or path separators into container commands.
USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
