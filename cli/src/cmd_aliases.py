"""Deprecated command spellings, forwarding to the new <noun> <verb> surface.

Every old spelling ('dtaas admin install', 'dtaas generate-deployment', ...)
remains here as an explicit alias that warns and forwards to its replacement for
one release (see DTaaS-CLI-Design.md §8). The whole 'admin' group is hidden from
the top-level 'dtaas --help', but its leaves stay visible under 'dtaas admin
--help' so an operator following an old runbook still finds the old->new map.
This whole module is a temporary deprecation-window layer: deleting it (and the
register_aliases call in cmd.py) removes every old spelling at once.
"""

import inspect
from typing import NamedTuple
import click
from .pkg import project as projectPkg
from .cmd_options import target_dir_option, force_option

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
# 'status' is intentionally absent: 'user status' is new in 2.0 with no old
# spelling, so it gets no alias (it was never called 'admin user status').
_USER_VERBS = ("add", "delete", "pause", "stop", "resume")

# platform stop/start/pause/resume narrowed from "whole installation" (pre-2.0
# 'admin ...') to "core services only", so their aliases must warn about the
# changed blast radius, not just the rename. Maps each narrowed verb to the
# 'user' verb that now covers per-user containers.
_USER_EQUIVALENT = {
    "stop": "stop",
    "start": "resume",
    "pause": "pause",
    "resume": "resume",
}


class _Dep(NamedTuple):
    """One deprecated spelling: its leaf name, old/new labels, and extra note."""

    name: str
    old: str
    new: str
    note: str = ""


class _DeprecatedCommand(click.Command):
    """A deprecated alias: warns (and optionally notes) then runs the real
    command through Click's normal invoke path.

    Going through super().invoke keeps pass_context / ctx.exit working, unlike
    calling the wrapped callback directly.
    """

    def __init__(self, notice, **kwargs):
        super().__init__(**kwargs)
        self._warning, self._note = notice

    def invoke(self, ctx):
        click.echo(self._warning, err=True)
        if self._note:
            click.echo(self._note, err=True)
        return super().invoke(ctx)


def _alias(target, dep, hidden=True):
    """Build a deprecated alias command from *target* for the *dep* spelling.

    Reuses *target*'s params (shared Parameter instances -- Click treats them as
    read-only, so this is safe) and callback, prefixing the help with a
    DEPRECATED marker so 'dtaas <old> --help' is not mistaken for current usage.
    """
    warning = (
        f"Warning: 'dtaas {dep.old}' is deprecated and will be removed in a "
        f"future release; use 'dtaas {dep.new}'."
    )
    help_text = f"DEPRECATED: use 'dtaas {dep.new}'."
    if target.help:
        help_text = f"{help_text}\n\n{inspect.cleandoc(target.help)}"
    return _DeprecatedCommand(
        (warning, dep.note),
        name=dep.name,
        params=list(target.params),
        callback=target.callback,
        help=help_text,
        hidden=hidden,
    )


def _scope_note(verb):
    """The blast-radius warning for a platform verb that narrowed to core-only."""
    user_verb = _USER_EQUIVALENT[verb]
    return (
        f"Scope change: 'platform {verb}' now affects the CORE services only; "
        f"per-user containers are left untouched. Use 'dtaas user {user_verb} "
        "--all' to include additional users."
    )


def _alias_subgroup(name, group, verbs):
    """A visible subgroup mirroring an old 'admin <name>' subgroup ('admin config').

    Each verb forwards from 'admin <name> <verb>' to '<name> <verb>'.
    """
    sub = click.Group(name=name, help=f"DEPRECATED: use 'dtaas {name} <verb>'.")
    for verb in verbs:
        dep = _Dep(verb, f"admin {name} {verb}", f"{name} {verb}")
        sub.add_command(_alias(group.commands[verb], dep, hidden=False))
    return sub


def _build_admin_group(config_group, platform_group, user_group):
    """The hidden 'admin' group with visible config/user subgroups and verbs."""
    admin = click.Group(
        name="admin",
        hidden=True,
        help="DEPRECATED: commands moved to 'config' / 'platform' / 'user'.",
    )
    admin.add_command(_alias_subgroup("config", config_group, _CONFIG_VERBS))
    admin.add_command(_alias_subgroup("user", user_group, _USER_VERBS))
    for verb in _PLATFORM_VERBS:
        note = _scope_note(verb) if verb in _USER_EQUIVALENT else ""
        dep = _Dep(verb, f"admin {verb}", f"platform {verb}", note)
        admin.add_command(_alias(platform_group.commands[verb], dep, hidden=False))
    return admin


@click.command(
    name="generate-project",
    hidden=True,
    help="DEPRECATED: use 'dtaas config generate' + 'dtaas deployment generate'.",
)
@target_dir_option
@force_option
def _generate_project(output_dir, force):
    """Reproduce the old generate-project via the new building blocks.

    generate-project split into two commands, and there is no sane default
    --type to forward to, so this is a purpose-built shim rather than a forward:
    it writes dtaas.toml (via generate_dtaas_toml, not generate_config, so it
    never touches users.csv -- the old command didn't either, and clobbering a
    curated one under --force would be a regression) and the user-template
    half of 'deployment generate' (the compose overlays + workspace skeleton),
    exactly the files the old command produced, and points at the two-step
    replacement. The scenario compose tree still needs
    'dtaas deployment generate --type <type>'.
    """
    click.echo(
        "Warning: 'dtaas generate-project' is deprecated and will be removed in "
        "a future release; it split into 'dtaas config generate' (writes "
        "dtaas.toml) and 'dtaas deployment generate --type <type>' (writes the "
        "compose tree). This shim runs the config + user-template halves.",
        err=True,
    )
    try:
        projectPkg.generate_dtaas_toml(output_dir, force)
        projectPkg.generate_user_templates(output_dir, force)
    except OSError as exc:
        raise click.ClickException(f"Error while generating project: {exc}") from exc
    click.echo("Project files generated successfully")


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
    root.add_command(_generate_project)
