"""File modes of the config files the CLI writes into an installation."""

from .constants import PUBLIC_CONFIG_FILENAMES, SECRET_FILENAMES


def config_mode(name):
    """Return the mode for a config file named *name*, or None to leave it.

    0600 for a credential-bearing file, 0644 for a file a non-root container
    must read (config/client.js, served as /env.js by uid 1000).
    """
    if name in SECRET_FILENAMES:
        return 0o600
    if name in PUBLIC_CONFIG_FILENAMES:
        return 0o644
    return None


def set_config_mode(path):
    """chmod *path* to its config_mode, on every call, not only on a change.

    An installation written by an older CLI must end up at the right mode
    too: a world-readable secret, or a client.js left at 0600 (#1861).
    """
    mode = config_mode(path.name)
    if mode is not None:
        path.chmod(mode)
