"""Deprecated top level command spellings.

Each old spelling is a hidden command that prints a deprecation notice to
stderr and forwards to its `<noun> <verb>` replacement. Remove this module at
the next major version.
"""

import click
from . import host_ops, project_ops, service_ops

DEPRECATED_ALIASES: list[tuple[str, str, click.Command]] = [
    ("generate-project", "project generate", project_ops.generate),
    ("setup", "host setup", host_ops.setup),
    ("install", "service install", service_ops.install),
    ("start", "service start", service_ops.start),
    ("stop", "service stop", service_ops.stop),
    ("restart", "service restart", service_ops.restart),
    ("status", "service status", service_ops.status),
    ("remove", "service remove", service_ops.remove),
    ("clean", "service clean", service_ops.clean),
]


def _deprecated_alias(
    old_name: str, new_name: str, target: click.Command
) -> click.Command:
    """Build a hidden command that warns on stderr and forwards to target."""

    @click.pass_context
    def forward(ctx: click.Context, **kwargs):
        click.echo(
            f"Warning: 'dtaas-services {old_name}' is deprecated; "
            f"use 'dtaas-services {new_name}'.",
            err=True,
        )
        ctx.invoke(target, **kwargs)

    return click.Command(
        name=old_name,
        callback=forward,
        params=list(target.params),
        help=f"Deprecated: use 'dtaas-services {new_name}'.",
        hidden=True,
    )


def register_deprecated_aliases(group: click.Group) -> None:
    """Add every deprecated spelling to the root group."""
    for old_name, new_name, target in DEPRECATED_ALIASES:
        group.add_command(_deprecated_alias(old_name, new_name, target))
