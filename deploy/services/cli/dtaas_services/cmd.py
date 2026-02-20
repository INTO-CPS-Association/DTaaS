"""DTaaS Services CLI main entry point."""

import click
from .commands import service_ops, setup_ops, user_ops


@click.group()
def services():
    """Manage DTaaS platform services."""


# Register setup and installation commands
services.add_command(setup_ops.generate_project, name="generate-project")
services.add_command(setup_ops.setup)
services.add_command(setup_ops.install)

# Register service operational commands
services.add_command(service_ops.start)
services.add_command(service_ops.stop)
services.add_command(service_ops.restart)
services.add_command(service_ops.status)
services.add_command(service_ops.remove)
services.add_command(service_ops.clean)


# Register user management command group
@services.group()
def user():
    """User account management for services."""


user.add_command(user_ops.add)
user.add_command(user_ops.reset_password)


if __name__ == "__main__":
    services()
