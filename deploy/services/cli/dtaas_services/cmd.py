"""DTaaS Services CLI main entry point."""

import click
from .commands import host_ops, project_ops, service_ops, user_ops
from .pkg.utils import permission_hint


class WorkflowGroup(click.Group):
    """Group that lists commands in registration order instead of alphabetically."""

    def list_commands(self, ctx: click.Context) -> list[str]:
        return list(self.commands)


class ServicesGroup(WorkflowGroup):
    """Root group: a file no command could open ends the command with the fix,
    not a traceback (see ``permission_hint``)."""

    def invoke(self, ctx: click.Context):
        try:
            return super().invoke(ctx)
        except PermissionError as exc:
            message = permission_hint(exc.filename) if exc.filename else str(exc)
            raise click.ClickException(message) from exc


@click.group(cls=ServicesGroup)
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


@services.group(cls=WorkflowGroup)
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


if __name__ == "__main__":
    services()
