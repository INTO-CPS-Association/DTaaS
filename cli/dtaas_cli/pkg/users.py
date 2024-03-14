import click
import yaml

from . import helper
from . import dtaas

def __replaceAll(obj, DTaaSDir, username):

    if type(obj)==str:
        s = obj.replace("$DTAAS_DIR", DTaaSDir).replace("$username", username)
        return s

    __replaceAll(obj)
    return obj


def __getComposeConfig(username):
    DTaaSDirPath, err = dtaas.getPath()
    if err!=None:
        return None, err
    config = {
            "image": "mltooling/ml-workspace-minimal:0.13.2",
            "volumes": [
                "{DTAAS_DIR}/files/common:/workspace/common".format(DTAAS_DIR=DTaaSDirPath), 
                "{DTAAS_DIR}/files/{username}:/workspace".format(DTAAS_DIR=DTaaSDirPath,username=username)
                ],
            "environment": [
                'AUTHENTICATE_VIA_JUPYTER=',
                "WORKSPACE_BASE_URL={username}".format(username=username)
                ],
            "shm_size": "512m",
            "labels":[
                "traefik.enable=true",
                "traefik.http.routers.{username}.entryPoints=web".format(username=username),
                "traefik.http.routers.{username}.rule=PathPrefix(`/{username}`)".format(username=username),
                "traefik.http.routers.{username}.middlewares=traefik-forward-auth".format(username=username)
                ]
        }
    
    return config, None

def __addUsersToCompose(users, compose):
    for username, email in users.items():
        
        config, err = __getComposeConfig(username)
        if err!=None:
            return err
        compose['services'][username] = config
    return None

def addUsers(filepath):

    user_list, err = helper.importYaml(filepath)
    if err!=None:
        return err
    
    compose, err = helper.importYaml('compose.users.yml')
    if err!=None:
        return err

    if 'version' not in compose:
        compose['version'] = '3'
    if 'services' not in compose:
        compose['services'] = {}
    
    err = __addUsersToCompose(user_list, compose)
    if err!=None:
        return err

    err = helper.exportYaml(compose, 'compose.users.yml')
    if err!=None:
        return err
    
    return None

def deleteUser(username):

    compose,err = helper.importYaml('compose.users.yml')
    if err!=None:
        return err

    if 'services' not in compose:
        return
    if username not in compose['services']:
        return
    
    del compose['services'][username]

    err = helper.exportYaml(compose, 'compose.users.yml')
    if err!=None:
        return err
    return None