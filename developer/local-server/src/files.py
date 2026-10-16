"""Small file helpers shared by the local server steps."""

import re


def set_env_value(text, key, value):
    """Set key=value in the text of a .env file, appending it if missing."""
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        return pattern.sub(lambda _: f"{key}={value}", text)
    return text.rstrip("\n") + f"\n{key}={value}\n"


def update_env_file(path, values):
    """Set every key=value pair of the values dict in the .env file at path."""
    text = path.read_text(encoding="utf-8")
    for key, value in values.items():
        text = set_env_value(text, key, value)
    path.write_text(text, encoding="utf-8")


def write_private(path, text):
    """Write text to a file that only the owner can read, even if it exists."""
    path.touch(mode=0o600)
    path.chmod(0o600)
    path.write_text(text, encoding="utf-8")
