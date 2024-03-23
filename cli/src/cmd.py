import click
#from . import service
from .pkg import dtaas as dtaasPkg
from .pkg import users as userPkg
from .pkg import utils



### Groups
@click.group()
def dtaas():
    """all commands to help with Digital Twins as a Service"""
    pass

@dtaas.group()
def admin():
    "administrative commands for DTaaS"
    pass

@admin.group()
def user():
    """user management commands"""
    pass

#### user group commands
@user.command()
def add():
    """
    add a list of users to DTaaS at once\n
    Specify the list in dtaas.toml [users].add\n
    """

    configObj = dtaasPkg.Config()

    err = userPkg.addUsers(configObj)
    if err!=None:
        raise click.ClickException("Error while adding users: " + str(err))
    click.echo("Users added successfully")

@user.command()
def delete():
    """
    removes the USERNAME user from DTaaS\n
    Specify the users in dtaas.toml [users].delete\n
    """

    configObj = dtaasPkg.Config()
    
    err = userPkg.deleteUser(configObj)
    if err!=None:
        raise click.ClickException("Error while deleting users: " + str(err))
    click.echo("User deleted successfully")