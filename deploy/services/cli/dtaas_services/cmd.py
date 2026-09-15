"""DTaaS Services CLI main entry point."""

import click
from .commands import aliases, host_ops, project_ops, service_ops, user_ops


class WorkflowGroup(click.Group):
    """Group that lists commands in registration order instead of alphabetically."""

    def list_commands(self, ctx: click.Context) -> list[str]:
        return list(self.commands)


@click.group(cls=WorkflowGroup)
def services():
    """Manage DTaaS platform services.

    Commands follow `dtaas-services <noun> <verb>` and are listed in
    install order: project, host, service, user.
    """


# Nouns are registered in workflow order: project, host, service, user
@services.group()
def project():
    """Project scaffold: config, data and log folders, and compose files."""


project.add_command(project_ops.generate)


@services.group()
def host():
    """Host preparation: TLS certificates and file permissions (needs root)."""


host.add_command(host_ops.setup)


@services.group()
def service():
    """Service containers: install, start, stop, restart, status, remove, clean."""


for _command in (
    service_ops.install,
    service_ops.start,
    service_ops.stop,
    service_ops.restart,
    service_ops.status,
    service_ops.remove,
    service_ops.clean,
):
    service.add_command(_command)


@services.group()
def user():
    """User account management for services."""


user.add_command(user_ops.add)
user.add_command(user_ops.reset_password)

aliases.register_deprecated_aliases(services)


if __name__ == "__main__":
    services()
