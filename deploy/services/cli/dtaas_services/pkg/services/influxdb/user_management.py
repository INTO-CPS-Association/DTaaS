"""Influxdb user management module."""

from ._utils import parse_json_response, execute_influxdb_command

AE = "already exists"


def create_influxdb_user(username: str, password: str) -> tuple[bool, str]:
    """
    Create a single InfluxDB user.
    Args:
        username: InfluxDB username
        password: InfluxDB password
    Returns:
        Tuple of (success, error message if any)
    """
    success, output = execute_influxdb_command(
        ["influx", "user", "create", "--skip-verify", "-n", username, "-p", password],
        f"Failed to create user {username}",
    )

    if not success:
        if AE in output:
            print(f"User '{username}' {AE}, skipping...")
            return True, ""
        return False, output
    return True, ""


def get_influxdb_users() -> tuple[bool, dict, str]:
    """
    Get list of InfluxDB users as a dictionary.

    Returns:
        Tuple of (success, users dict, error message if any)
    """
    success, users_json_str = execute_influxdb_command(
        ["influx", "user", "list", "--skip-verify", "--json"],
        "Failed to retrieve user list",
    )
    if not success:
        return False, {}, users_json_str
    success, users_json_list, error_msg = parse_json_response(users_json_str)
    if not success:
        return False, {}, error_msg
    users_dict = {user["name"]: user["id"] for user in users_json_list}
    return True, users_dict, ""


def get_existing_orgs() -> tuple[bool, set, str]:
    """
    Get set of existing organization names in InfluxDB.

    Returns:
        Tuple of (success, set of org names, error message if any)
    """
    success, orgs_json_str = execute_influxdb_command(
        ["influx", "org", "list", "--skip-verify", "--json"],
        "Failed to retrieve org list",
    )
    if not success:
        return False, set(), orgs_json_str
    success, orgs_json_list, error_msg = parse_json_response(orgs_json_str)
    if not success:
        return False, set(), error_msg
    org_names = {org["name"] for org in orgs_json_list}
    return True, org_names, ""


def _handle_bucket_creation(name: str, error_msg: str) -> tuple[bool, str]:
    """Handle bucket creation result."""
    if AE in error_msg:
        print(f"Bucket '{name}' {AE}, skipping...")
        return True, ""
    print(f"Docker error: {error_msg}")
    return False, error_msg


def _handle_membership_creation(name: str, error_msg: str) -> tuple[bool, str]:
    """Handle organization membership creation result."""
    if AE in error_msg:
        print(f"Organization membership for '{name}' {AE}, skipping...")
        return True, ""
    print(f"Docker error: {error_msg}")
    return False, error_msg


def _create_org_if_needed(name: str, existing_orgs: set) -> tuple[bool, str]:
    """Create organization if it doesn't already exist.

    Args:
        name: Organization name
        existing_orgs: Set of existing organization names

    Returns:
        Tuple of (success, error message if any)
    """
    if name in existing_orgs:
        return True, ""
    return execute_influxdb_command(
        [
            "influx",
            "org",
            "create",
            "--skip-verify",
            "--name",
            name,
            "--description",
            name,
        ],
        f"Failed to create organization {name}",
    )


def _add_user_as_org_owner(
    username: str, user_id: str, org_name: str
) -> tuple[bool, str]:
    """Add user as owner to organization.

    Args:
        username: Username (for error messages)
        user_id: User ID to add as owner
        org_name: Organization name

    Returns:
        Tuple of (success, error message if any)
    """
    success, error_msg = execute_influxdb_command(
        [
            "influx",
            "org",
            "members",
            "add",
            "--skip-verify",
            "--name",
            org_name,
            "--owner",
            "-m",
            user_id,
        ],
        f"Failed to add user {user_id} as owner to {org_name}",
    )
    if not success:
        return _handle_membership_creation(username, error_msg)
    return True, ""


def setup_user_org_bucket(
    name: str, user_id: str, existing_orgs: set
) -> tuple[bool, str]:
    """
    Set up organization and bucket for a user.

    Args:
        name: Organization/bucket name (typically the username)
        user_id: User ID to add as owner
        existing_orgs: Set of existing organization names

    Returns:
        Tuple of (success, error message if any)
    """
    # Create organization only if it doesn't exist
    success, error_msg = _create_org_if_needed(name, existing_orgs)
    if not success:
        return False, error_msg

    # Add user as owner to organization
    success, error_msg = _add_user_as_org_owner(name, user_id, name)
    if not success:
        return False, error_msg

    # Create bucket
    success, error_msg = execute_influxdb_command(
        [
            "influx",
            "bucket",
            "create",
            "--skip-verify",
            "--name",
            name,
            "--org",
            name,
        ],
        f"Failed to create bucket {name}",
    )
    if not success:
        return _handle_bucket_creation(name, error_msg)

    return True, ""


def setup_user_organizations(users_dict: dict, existing_orgs: set) -> tuple[bool, str]:
    """Set up organization and bucket for each user."""
    for name, user_id in users_dict.items():
        success, error_msg = setup_user_org_bucket(name, user_id, existing_orgs)
        if not success:
            return False, error_msg
    return True, ""
