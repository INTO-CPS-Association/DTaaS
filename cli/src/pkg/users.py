import subprocess
from . import utils

def __getComposeConfig(username, server, DTaaSDirPath):
    
    template = {}
    mapping = {
        "${DTAAS_DIR}": DTaaSDirPath,
        "${username}" : username,
    }
    
    if server==utils.LOCALHOST_SERVER:
        template, err = utils.importYaml('users.local.yml')
        if err!=None:
            return err
    else:
        template, err = utils.importYaml('users.server.yml')
        if err!=None:
            return err
        mapping["${SERVER_DNS}"] = server
    
    config = utils.replaceAll(template, mapping)
    
    return config, None

def __addUsersToCompose(users, compose, server, path):
    for username in users:
        config, err = __getComposeConfig(username, server, path)
        if err!=None:
            return err
        compose['services'][username] = config
    return None

def __startUserContainers(users):

    cmd = ["docker compose -f compose.users.yml up -d"]
    for username in users:
        cmd.append(username)
    
    cmdStr = " ".join(cmd)
    subprocess.run(cmdStr, shell=True)

    return None

def __stopUserContainers(users):

    cmd = ["docker compose -f 'compose.users.yml' down"]
    for username in users:
        cmd.append(username)
    
    cmdStr = " ".join(cmd)
    subprocess.run(cmdStr, shell=True)

    return None



def addUsers(configObj):
    
    compose, err = utils.importYaml('compose.users.yml')
    if err!=None:
        return err
    userList, err = configObj.getAddUsersList()
    if err!=None:
        return err
    server, err= configObj.getServerDNS()
    if err!=None:
        return err
    path, err = configObj.getPath()
    if err!=None:
        return err

    if 'version' not in compose:
        compose['version'] = '3'
    if 'services' not in compose:
        compose['services'] = {}
    
    
    err = __addUsersToCompose(userList, compose, server, path)
    if err!=None:
        return err

    err = utils.exportYaml(compose, 'compose.users.yml')
    if err!=None:
        return err
    
    err = __startUserContainers(userList)
    if err!=None:
        return err
    
    return None

def deleteUser(configObj):

    compose,err = utils.importYaml('compose.users.yml')
    if err!=None:
        return err
    userList, err = configObj.getDeleteUsersList()
    if err!=None:
        return err
    
    err = __stopUserContainers(userList)
    if err!=None:
        return err
    
    for username in userList:
        if 'services' not in compose:
            return
        if username not in compose['services']:
            return
        
        del compose['services'][username]

    err = utils.exportYaml(compose, 'compose.users.yml')
    if err!=None:
        return err
    return None