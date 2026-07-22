"""Deprecated command spellings, forwarding to the new <noun> <verb> surface.

Every old spelling ('dtaas admin install', 'dtaas generate-deployment', ...)
remains here as an explicit, hidden alias that forwards to its replacement and
prints a one-line deprecation notice to stderr (see DTaaS-CLI-Design.md §8).
This whole module is a temporary deprecation-window layer: deleting it (and the
register_aliases call in cmd.py) removes every old spelling at once.
"""

from typing import NamedTuple
import click


_PLATFORM_VERBS = (
    "install",
    "uninstall",
    "update",
    "status",
    "stop",
    "start",
    "pause",
    "resume",
)
_CONFIG_VERBS = ("generate", "validate", "reconcile")
_USER_VERBS = ("add", "delete", "status", "pause", "stop", "resume")

_PROJECT_NOTE = "Note: 'dtaas config generate' now writes dtaas.toml; run it first."


class _Dep(NamedTuple):
    """One deprecated spelling: its leaf name, old/new labels, and extra note."""

    name: str
    old: str
    new: str
    note: str = ""


def _alias(new_cmd, dep):
    """Build a hidden Command that warns then forwards to *new_cmd*'s callback.

    Reuses *new_cmd*'s params so the old spelling accepts the same flags; the
    warning (and any *dep.note*) goes to stderr, then the real callback runs.
    """

    def callback(**kwargs):
        click.echo(
            f"Warning: 'dtaas {dep.old}' is deprecated and will be removed in a "
            f"future release; use 'dtaas {dep.new}'.",
            err=True,
        )
        if dep.note:
            click.echo(dep.note, err=True)
        return new_cmd.callback(**kwargs)

    return click.Command(
        name=dep.name,
        params=list(new_cmd.params),
        callback=callback,
        help=new_cmd.help,
        hidden=True,
    )


def _alias_subgroup(name, group, verbs):
    """A hidden group mirroring an old 'admin <name>' subgroup ('admin config').

    Each verb forwards from 'admin <name> <verb>' to '<name> <verb>'.
    """
    sub = click.Group(name=name, hidden=True)
    for verb in verbs:
        dep = _Dep(verb, f"admin {name} {verb}", f"{name} {verb}")
        sub.add_command(_alias(group.commands[verb], dep))
    return sub


def _build_admin_group(config_group, platform_group, user_group):
    """The hidden 'admin' group: flat platform verbs plus config/user subgroups."""
    admin = click.Group(
        name="admin",
        hidden=True,
        help="Deprecated; commands moved to 'config'/'platform'/'user'.",
    )
    admin.add_command(_alias_subgroup("config", config_group, _CONFIG_VERBS))
    admin.add_command(_alias_subgroup("user", user_group, _USER_VERBS))
    for verb in _PLATFORM_VERBS:
        dep = _Dep(verb, f"admin {verb}", f"platform {verb}")
        admin.add_command(_alias(platform_group.commands[verb], dep))
    return admin


def register_aliases(root):
    """Attach every deprecated spelling to the root 'dtaas' group.

    The noun groups are read back from *root* (added by cmd.py before this call)
    rather than imported, so this module stays a thin, deletable leaf: removing
    the module and its call site drops every old spelling without touching the
    noun modules.
    """
    root.add_command(
        _build_admin_group(
            root.commands["config"], root.commands["platform"], root.commands["user"]
        )
    )
    generate = root.commands["deployment"].commands["generate"]
    root.add_command(
        _alias(
            generate,
            _Dep("generate-deployment", "generate-deployment", "deployment generate"),
        )
    )
    root.add_command(
        _alias(
            generate,
            _Dep(
                "generate-project",
                "generate-project",
                "deployment generate",
                _PROJECT_NOTE,
            ),
        )
    )
