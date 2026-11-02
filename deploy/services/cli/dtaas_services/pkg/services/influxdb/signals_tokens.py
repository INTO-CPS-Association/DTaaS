"""Read-only InfluxDB tokens of the DTaaS signals gateway.

The gateway reads the history of a signal from the org and the bucket of the
twin's owner, both named after the user. For each such org this module creates
a token that can only read that one bucket, so a leaked gateway token cannot
write a point or read another user's data. The tokens go to the JSON file that
the gateway's influx-tokens-file names, {"<org>": "<token>"}, with mode 600.
A token is never printed: InfluxDB returns it once and it is written straight
to that file.
"""

import json
from pathlib import Path
from ...config import Config
from ...utils import write_secret_file
from ._utils import execute_influxdb_command, parse_json_response
from .user_management import get_existing_orgs

TOKENS_FILE_KEY = "SIGNALS_INFLUX_TOKENS_FILE"
ADMIN_ORG_KEY = "INFLUXDB_ORG"
DESCRIPTION = "dtaas-signals read {org}"


def get_tokens_file() -> Path | None:
    """Return the tokens file named in services.env, or None when it is unset.

    A relative path is read against the base directory of the CLI, where
    config/services.env lives.
    """
    value = Config().env.get(TOKENS_FILE_KEY, "").strip()
    if not value:
        return None
    path = Path(value)
    return path if path.is_absolute() else Config.get_base_dir() / path


def find_bucket_id(org: str) -> tuple[bool, str, str]:
    """Find the id of the bucket named after the org, inside that org.

    Returns:
        Tuple of (success, bucket id or "" when there is none, error message)
    """
    success, output = execute_influxdb_command(
        ["influx", "bucket", "list", "--skip-verify", "--json"]
        + ["--org", org, "--name", org],
        f"Failed to find bucket {org}",
    )
    if not success:
        # The influx CLI reports a missing bucket as an error.
        return (True, "", "") if "not found" in output else (False, "", output)
    success, buckets, error_msg = parse_json_response(output)
    if not success:
        return False, "", error_msg
    return True, (buckets[0]["id"] if buckets else ""), ""


def create_read_token(org: str, bucket_id: str) -> tuple[bool, str, str]:
    """Create a token that can only read one bucket of one org.

    Returns:
        Tuple of (success, token, error message if any)
    """
    success, output = execute_influxdb_command(
        ["influx", "auth", "create", "--skip-verify", "--json", "--org", org]
        + ["--read-bucket", bucket_id, "--description", DESCRIPTION.format(org=org)],
        f"Failed to create the read-only token of org {org}",
    )
    if not success:
        return False, "", output
    success, auth, error_msg = parse_json_response(output)
    if not success or not isinstance(auth, dict) or not auth.get("token"):
        return False, "", error_msg or f"No token in the answer for org {org}"
    return True, auth["token"], ""


def read_tokens(path: Path) -> tuple[bool, dict, str]:
    """Read the tokens file, or an empty mapping when it does not exist yet.

    Returns:
        Tuple of (success, {org: token}, error message if any)
    """
    if not path.exists():
        return True, {}, ""
    try:
        tokens = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        # The message names the file and not its content, which holds tokens.
        return False, {}, f"Cannot read {path}: {type(e).__name__}"
    if not isinstance(tokens, dict):
        return False, {}, f"{path} must map each org to a token"
    return True, tokens, ""


def _user_orgs() -> tuple[bool, list[str], str]:
    """List the orgs of users, leaving out the admin org of services.env.

    Returns:
        Tuple of (success, org names, error message if any)
    """
    success, orgs, error_msg = get_existing_orgs()
    if not success:
        return False, [], error_msg
    admin_org = Config().env.get(ADMIN_ORG_KEY, "")
    return True, sorted(org for org in orgs if org != admin_org), ""


def _add_token(org: str, tokens: dict) -> tuple[bool, str]:
    """Add the read-only token of one org to the mapping, when it has a bucket.

    Returns:
        Tuple of (success, error message if any)
    """
    success, bucket_id, error_msg = find_bucket_id(org)
    if not success or not bucket_id:
        return success, error_msg
    success, token, error_msg = create_read_token(org, bucket_id)
    if success:
        tokens[org] = token
    return success, error_msg


def write_signals_tokens(path: Path) -> tuple[bool, str]:
    """Give every user org without a token one, and write the tokens file.

    An org already in the file keeps its token, so running this again creates
    tokens only for new users instead of one more token for every user.

    Returns:
        Tuple of (success, message)
    """
    success, tokens, error_msg = read_tokens(path)
    if not success:
        return False, error_msg
    success, orgs, error_msg = _user_orgs()
    if not success:
        return False, error_msg
    before = len(tokens)
    for org in (org for org in orgs if org not in tokens):
        success, error_msg = _add_token(org, tokens)
        if not success:
            break
    # Written even after a failure, so the tokens already created are kept
    # and a second run does not create them again.
    write_secret_file(path, json.dumps(tokens, indent=2) + "\n")
    if not success:
        return False, error_msg
    added = len(tokens) - before
    return True, f"{added} new read-only token(s), {len(tokens)} org(s) in {path}"


def setup_signals_tokens() -> tuple[bool, str]:
    """Write the gateway's read-only tokens when services.env names the file.

    Returns:
        Tuple of (success, message, "" when no file is configured)
    """
    path = get_tokens_file()
    if path is None:
        return True, ""
    try:
        return write_signals_tokens(path)
    except OSError as e:
        return False, f"Cannot write {path}: {type(e).__name__}"
