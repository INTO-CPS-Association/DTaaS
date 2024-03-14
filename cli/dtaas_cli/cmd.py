import click
import sys
from .pkg import dtaas as dtaasPkg
from .pkg import users as userPkg

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

#### admin group commands
@admin.command()
@click.argument('path', type=click.Path(exists=True))
def set_path(path):
    """configure the path of your DTaaS directory"""
    err = dtaasPkg.setPath(path)
    if err!=None:
        raise click.UsageError(str(err))
    click.echo("Path set successfully")

@admin.command()
def get_path():
    """get the cuurent DTaaS directory path configuration"""
    path, err = dtaasPkg.getPath()
    if err!=None:
        raise click.ClickException("Error while getting path: " + str(err))
    click.echo(path)

#### user group commands
@user.command()
@click.argument('filepath', type=click.Path(exists=True))
def add(filepath):
    """
    add a list of users to DTaaS at once\n
    Arguments:\n
    \tFILEPATH - path to the yml file with username:email list
    """
    err = userPkg.addUsers(filepath)
    if err!=None:
        raise click.ClickException("Error while adding users: " + str(err))
    click.echo("Users added successfully")

@user.command()
@click.argument('username')
def delete(username):
    """removes the USERNAME user from DTaaS"""
    err = userPkg.deleteUser(username)
    if err!=None:
        raise click.ClickException("Error while deleting users: " + str(err))
    click.echo("User deleted successfully")