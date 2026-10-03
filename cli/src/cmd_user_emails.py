"""Reports an email a 'user add' run was given but does not apply.

Split out of cmd_user_utils.py, which resolves which users a run acts on,
the way cmd_user_passwords.py holds where a password comes from. dtaas.toml
owns a starting user's email: it is the address baked into their workspace
and the one GitLab provisioning uses (users_gitlab_targets takes it from
there, not from the run's inputs), so an --email or a users.csv column
naming another address is not applied. A mismatch is usually a mistake
about which user is being named, so it is reported rather than dropped in
silence, and the run carries on with the declared address.
"""

from .pkg.messages import echo_hint


def unused_emails(named, starting_emails):
    """The named starting users whose email is not the declared one.

    Compares what the run was given, which is what *named* carries for a
    starting user, against dtaas.toml's [[users]] record.
    """
    return [
        name
        for name, details in named.items()
        if starting_emails.get(name)
        and details.get("email") != starting_emails[name]
    ]


def warn_unused_emails(named, starting_emails):
    """Report every named starting user whose given email is not applied."""
    for name in unused_emails(named, starting_emails):
        echo_hint(
            f"Warning: the email given for '{name}' is not used.",
            f"dtaas.toml declares {starting_emails[name]} for this starting "
            "user, and that is the address GitLab gets.",
        )
