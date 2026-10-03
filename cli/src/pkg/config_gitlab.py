"""The value rules of dtaas.toml's [gitlab] project settings.

Read at run time through Config's getters and checked ahead of time by
config_validate_gitlab.py, so each rule ("both template keys or neither",
"a whole number of minutes") has one definition that both share. Kept out of
config.py, which is at its line limit.
"""

# The [gitlab] keys naming the repository each of a new user's two projects
# is imported from, one template per project. They have no built-in default:
# the values ship in the generated dtaas.toml, their single source of truth.
GITLAB_TEMPLATE_KEYS = ("common_template", "user_template")

# The [gitlab] keys given in whole minutes: how long one repository import
# may take, and how long a whole 'user add' run may spend waiting on imports
# before it stops starting new users.
MINUTE_KEYS = ("import_timeout", "import_deadline")


def _trimmed_template(section):
    """The [gitlab] template keys, trimmed, keyed by their dtaas.toml names."""
    return {key: str(section.get(key, "") or "").strip() for key in GITLAB_TEMPLATE_KEYS}


def gitlab_template_values(section):
    """Read the project template keys out of a [gitlab] *section*.

    Shared with config_validate_gitlab.py so "both keys, or neither of them"
    has a single definition.

    Returns:
        Tuple of (values, problem). *values* is None when the section sets
        none of the keys, which is not a problem: project creation is simply
        not configured. *problem* is a message naming the missing keys when
        only some of them are set, which is a mistake rather than an opt out.
    """
    values = _trimmed_template(section)
    missing = [key for key, value in values.items() if not value]
    if len(missing) == len(GITLAB_TEMPLATE_KEYS):
        return None, None
    if missing:
        listed = ", ".join(f"gitlab.{key}" for key in missing)
        return None, f"gitlab project template is incomplete; also set {listed}"
    return values, None


def minutes_problem(key):
    """The complaint about *key* holding something other than minutes."""
    return f"gitlab.{key} must be a whole number of minutes, 1 or more"


def gitlab_minutes(section, key):
    """Read one of MINUTE_KEYS out of a [gitlab] *section*.

    Shared with config_validate_gitlab.py, like gitlab_template_values, so
    each rule has a single definition. Both keys are optional and
    independent of the template keys: without them the defaults apply.

    Returns:
        Tuple of (minutes, problem), both None when the key is absent.
    """
    value = section.get(key)
    if value is None:
        return None, None
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        return None, minutes_problem(key)
    return value, None
