"""This file defines all cli entrypoints for DTaaS"""

import click
from .pkg import config as configPkg
from .pkg import users as userPkg


### Groups
@click.group()
def dtaas():
    """all commands to help with Digital Twins as a Service"""
    return


@dtaas.group()
def admin():
    "administrative commands for DTaaS"
    return


@admin.group()
def user():
    """user management commands"""
    return


#### user group commands
@user.command()
def add():
    """
    add a list of users to DTaaS at once\n
    Specify the list in dtaas.toml [users].add\n
    """

    config_obj = configPkg.Config()

    err = userPkg.add_users(config_obj)
    if err is not None:
        raise click.ClickException("Error while adding users: " + str(err))
    click.echo("Users added successfully")


@user.command()
def delete():
    """
    removes the USERNAME user from DTaaS\n
    Specify the users in dtaas.toml [users].delete\n
    """

    config_obj = configPkg.Config()

    err = userPkg.delete_user(config_obj)
    if err is not None:
        raise click.ClickException("Error while deleting users: " + str(err))
    click.echo("User deleted successfully")
