"""This file has functions that handle the user cli commands"""

import subprocess
import shutil
from src.pkg import utils


def getComposeConfig(username, server, path):
    """Makes and returns the config for the user"""

    template = {}
    mapping = {
        "${DTAAS_DIR}": path,
        "${username}": username,
    }
    try:
        if server == utils.LOCALHOST_SERVER:
            template, err = utils.importYaml("users.local.yml")
            utils.checkError(err)

        else:
            template, err = utils.importYaml("users.server.yml")
            utils.checkError(err)
            mapping["${SERVER_DNS}"] = server

        config, err = utils.replaceAll(template, mapping)
        utils.checkError(err)
    except Exception as e:
        return None, e

    return config, None


def createUserFiles(users, filePath):
    """Creates all the users' workspace directories"""
    for username in users:
        shutil.copytree(
            filePath + "/template", filePath + "/" + username, dirs_exist_ok=True
        )


def addUsersToCompose(users, compose, server, path):
    """Adds all the users config to the compose dictionary"""
    for username in users:
        config, err = getComposeConfig(username, server, path)
        if err is not None:
            return err
        compose["services"][username] = config
    return None


def startUserContainers(users):
    """Starts all the user containers in the 'users' list"""

    cmd = "docker compose -f compose.users.yml up -d"
    err = runCommandForContainers(cmd, users)
    return err


def stopUserContainers(users):
    """Stops all the user containers in the 'users' list"""

    cmd = "docker compose -f 'compose.users.yml' down"
    err = runCommandForContainers(cmd, users)
    return err


def runCommandForContainers(command, containers):
    cmd = [command]
    for name in containers:
        cmd.append(name)

    cmdStr = " ".join(cmd)
    result = subprocess.run(cmdStr, shell=True, check=False)
    if result.returncode != 0:
        return Exception(f"failed to run '{cmdStr}' command")
    return None


def addUsers(configObj):
    """add cli command handler"""
    try:
        compose, err = utils.importYaml("compose.users.yml")
        utils.checkError(err)
        userList, err = configObj.getAddUsersList()
        utils.checkError(err)
        server, err = configObj.getServerDNS()
        utils.checkError(err)
        path, err = configObj.getPath()
        utils.checkError(err)
    except Exception as e:
        return e

    if "version" not in compose:
        compose["version"] = "3"
    if "services" not in compose:
        compose["services"] = {}
    if "networks" not in compose:
        compose["networks"] = {"users": {"name": "dtaas-users", "external": True}}

    try:
        err = createUserFiles(userList, path + "/files")
        utils.checkError(err)
        err = addUsersToCompose(userList, compose, server, path)
        utils.checkError(err)
        err = utils.exportYaml(compose, "compose.users.yml")
        utils.checkError(err)
        err = startUserContainers(userList)
        utils.checkError(err)
    except Exception as e:
        return e

    return None


def deleteUser(configObj):
    """delete cli command handler"""
    try:
        compose, err = utils.importYaml("compose.users.yml")
        utils.checkError(err)
        userList, err = configObj.getDeleteUsersList()
        utils.checkError(err)
        err = stopUserContainers(userList)
        utils.checkError(err)

        for username in userList:
            if "services" in compose and username in compose["services"]:
                del compose["services"][username]

        err = utils.exportYaml(compose, "compose.users.yml")
        utils.checkError(err)

    except Exception as e:
        return e

    return None
