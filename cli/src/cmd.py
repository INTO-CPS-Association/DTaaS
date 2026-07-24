"""This file defines the root 'dtaas' group and wires the noun groups.

Every command follows a single grammar -- dtaas <noun> <verb> -- with four
nouns: config, deployment, platform, user (see DTaaS-CLI-Design.md). Each noun
is a Click group defined in its own cmd_<noun>.py module and attached here in
the config -> deployment -> platform -> user workflow order. Deprecated old
spellings are registered from cmd_aliases.py for one release.
"""

import click
from .cmd_config import config_group
from .cmd_deployment import deployment_group
from .cmd_platform import platform_group
from .cmd_user import user_group
from .cmd_aliases import register_aliases

# The noun groups in workflow order: configure, then generate the files, then
# operate the platform, then manage users. dtaas --help lists them in this order.
_WORKFLOW_ORDER = ("config", "deployment", "platform", "user")


class WorkflowGroup(click.Group):
    """Root group that lists its noun commands in workflow order, not A-Z."""

    def list_commands(self, ctx):
        names = super().list_commands(ctx)
        ordered = [name for name in _WORKFLOW_ORDER if name in names]
        extras = [name for name in names if name not in _WORKFLOW_ORDER]
        return ordered + extras


@click.group(cls=WorkflowGroup)
def dtaas():
    """Provision, configure, and manage Digital Twin as a Service environments.

    Commands follow a 'dtaas <noun> <verb>' grammar, grouped by the setup
    workflow: config -> deployment -> platform -> user.

    \b
    First-time setup:
      1.  dtaas config generate               # create dtaas.toml template
      2.  # edit dtaas.toml (server DNS, paths, credentials)
      3.  dtaas config validate               # check for errors
      4.  dtaas deployment generate --type secure-server
      5.  dtaas platform install              # start containers
      6.  dtaas user add alice --email a@x.io # add users to the instance

    Full documentation: https://pypi.org/project/dtaas
    """


dtaas.add_command(config_group)
dtaas.add_command(deployment_group)
dtaas.add_command(platform_group)
dtaas.add_command(user_group)
register_aliases(dtaas)


if __name__ == "__main__":
    dtaas()
