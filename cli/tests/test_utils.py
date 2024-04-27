from src.pkg import utils
import filecmp
from pprint import pprint

def test_import_yaml_users():

    expected = {
        "image": "mltooling/ml-workspace-minimal:0.13.2",
        "volumes": [
        "${DTAAS_DIR}/files/common:/workspace/common",
        "${DTAAS_DIR}/files/${username}:/workspace"
        ],
        "environment":[
        "AUTHENTICATE_VIA_JUPYTER=",
        "WORKSPACE_BASE_URL=${username}"
        ],
        "shm_size": "512m",
        "labels": [
        "traefik.enable=true",
        "traefik.http.routers.${username}.entryPoints=web",
        "traefik.http.routers.${username}.rule=PathPrefix(`/${username}`)",
        "traefik.http.routers.${username}.middlewares=traefik-forward-auth"
        ],
        "networks":[
            "users"
        ]
    }

    template, err= utils.importYaml("users.local.yml")
    if err!=None:
        raise Exception(err)
    
    assert template==expected

def test_import_yaml_compose():
    expected = getTestComposeObject()

    compose, err = utils.importYaml('tests/compose.users.test.yml')
    if err is not None:
        raise Exception(err)
    assert expected==compose

def test_import_toml():
    toml, err = utils.importToml('dtaas.toml')
    if err is not None:
        raise Exception(err)
    
    expected = {
        "name" : "Digital Twin as a Service (DTaaS)",
        "version" : "0.1.0",
        "owner" : "The INTO-CPS-Association",
        "git-repo" : "https://github.com/into-cps-association/DTaaS.git",

        "common":{
        # absolute path to the DTaaS application directory
        "server-dns" : "localhost",
        "path" : "/home/astitva/Desktop/yamlstuff"
        },
        "users":{
            # matching user info must present in this config file
            "add" : ["username1","username2", "username3"],
            "delete" : ["username2", "username3"],

            "username1" :{
            "email" : "username1@gitlab.foo.com"
            },
            "username2" :{
            "email" : "username2@gitlab.foo.com"
            },
            "username3" : {
            "email" : "username3@gitlab.foo.com"
            }
        },

        "client":{
            "web":
                {
                "config" : "/home/astitva/Desktop/yamlstuff/env.local.js"
                }
        }
    }
    
    assert expected==toml

def test_replace_all():

    template = getReplaceAllObject("stringval1", "stringval2", "stringval3", "listval1", "listval2", "listval3")

    expected = getReplaceAllObject("one", "two", "three", "foo", "bar", "qux")

    mapping = {
        "stringval1": "one",
        "stringval2": "two",
        "stringval3": "three",
        "listval1": "foo",
        "listval2": "bar",
        "listval3": "qux",
    }
    
    ans, err = utils.replaceAll(template, mapping)

    assert ans==expected

def test_export_yaml():

    data = getTestComposeObject()

    err = utils.exportYaml(data, 'tests/compose.users.exp.yml')
    if err is not None:
        raise Exception(err)
    
    assert filecmp.cmp('tests/compose.users.test.yml', 'tests/compose.users.exp.yml')

def getReplaceAllObject(stringval1, stringval2, stringval3, listval1, listval2, listval3):

    obj = {
        "key1": stringval1,
        "key2": [listval1, listval2, listval3],
        "dictkey1":{
            "dict1key1": stringval2,
            "dict2key2": [listval1,listval3],
            "dict3key3": {
                "key3":stringval1,
                "key4":{
                    "listkey": [listval2]
                }
            }
        },
        "dictkey2": {
            "dict2key1" : {
                "key5": stringval3,
                "key6": listval1,
                "key7": [listval2, listval3]
            },
            "dict2key2": stringval2,
            "dict2key3": listval2
        }
    }

    return obj

def getTestComposeObject():
    testCompose = {
        "version": '3',
        "services":{
            "astitvasehgal05":{
                "image": "mltooling/ml-workspace-minimal:0.13.2",
                "volumes": [
                "/home/astitva/Desktop/yamlstuff/files/common:/workspace/common",
                "/home/astitva/Desktop/yamlstuff/files/astitvasehgal05:/workspace"
                ],
                "environment":[
                "AUTHENTICATE_VIA_JUPYTER=",
                "WORKSPACE_BASE_URL=astitvasehgal05"
                ],
                "shm_size": "512m",
                "labels": [
                "traefik.enable=true",
                "traefik.http.routers.astitvasehgal05.entryPoints=web",
                "traefik.http.routers.astitvasehgal05.rule=PathPrefix(`/astitvasehgal05`)",
                "traefik.http.routers.astitvasehgal05.middlewares=traefik-forward-auth"
                ],
                "networks":["users"]
            }
        },
        "networks":{
            "users":{
                "name":"dtaas-users",
                "external": True,
            }
        }
    }

    return testCompose