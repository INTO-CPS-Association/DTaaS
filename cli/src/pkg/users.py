"""This file has functions that handle the user cli commands"""

import subprocess
from . import utils

def getComposeConfig(username, server, path):
    """Makes and returns the config for the user"""

    template = {}
    mapping = {
        "${DTAAS_DIR}": path,
        "${username}" : username,
    }

    if server==utils.LOCALHOST_SERVER:
        template, err = utils.importYaml('users.local.yml')
        if err is not None:
            return err
    else:
        template, err = utils.importYaml('users.server.yml')
        if err is not None:
            return err
        mapping["${SERVER_DNS}"] = server

    config, err = utils.replaceAll(template, mapping)
    if err is not None:
        return None, err

    return config, None

def addUsersToCompose(users, compose, server, path):
    """Adds all the users config to the compose dictionary"""

    for username in users:
        config, err = getComposeConfig(username, server, path)
        if err is not None:
            return err
        compose['services'][username] = config
    return None

def startUserContainers(users):
    """Starts all the user containers in the 'users' list"""

    cmd = ["docker compose -f compose.users.yml up -d"]
    for username in users:
        cmd.append(username)

    cmdStr = " ".join(cmd)
    subprocess.run(cmdStr, shell=True, check=False)

def stopUserContainers(users):
    """Stops all the user containers in the 'users' list"""

    cmd = ["docker compose -f 'compose.users.yml' down"]
    for username in users:
        cmd.append(username)

    cmdStr = " ".join(cmd)
    subprocess.run(cmdStr, shell=True, check=False)

def addUsers(configObj):
    """add cli command handler"""

    compose, err = utils.importYaml('compose.users.yml')
    if err is not None:
        return err
    userList, err = configObj.getAddUsersList()
    if err is not None:
        return err
    server, err= configObj.getServerDNS()
    if err is not None:
        return err
    path, err = configObj.getPath()
    if err is not None:
        return err

    if 'version' not in compose:
        compose['version'] = '3'
    if 'services' not in compose:
        compose['services'] = {}


    err = addUsersToCompose(userList, compose, server, path)
    if err is not None:
        return err
    
    err = utils.exportYaml(compose, 'compose.users.yml')
    if err is not None:
        return err

    startUserContainers(userList)

    return None

def deleteUser(configObj):
    """delete cli command handler"""

    compose,err = utils.importYaml('compose.users.yml')
    if err is not None:
        return err
    userList, err = configObj.getDeleteUsersList()
    if err is not None:
        return err

    stopUserContainers(userList)

    for username in userList:
        if 'services' not in compose:
            return None
        if username not in compose['services']:
            return None
        del compose['services'][username]

    err = utils.exportYaml(compose, 'compose.users.yml')
    if err is not None:
        return err
    return None
