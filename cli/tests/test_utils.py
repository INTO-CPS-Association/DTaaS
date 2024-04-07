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
    expected = {
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
                "networks":[
                    "users"
                ]
            }

        },
        "networks":{
            "users":{
                "name":"dtaas-users",
                "external": True,
            }
        }
    }

    compose, err = utils.importYaml('src/test_units/compose.users.test.yml')
    if err is not None:
        raise Exception(err)
    assert expected==compose

def test_import_toml():
    toml, err = utils.importToml('dtaas.toml')
    if err is not None:
        raise Exception(err)
    
    expected = {
        "name" : "Digital Twin as a Service (DTaaS)",
        "version" : "0.1",
        "owner" : "The INTO-CPS-Association",
        "git-repo" : "https://github.com/into-cps-association/DTaaS.git",

        "common":{
        # absolute path to the DTaaS application directory
        "server-dns" : "localhost",
        "path" : "/home/astitva/Desktop/yamlstuff"
        },
        "users":{
            # matching user info must present in this config file
            "add" : ["astitvasehgal05","astitvasehgal19", "prasad"],
            "delete" : ["astitvasehgal19", "prasad"],

            "astitvasehgal05" :{
            "email" : "username1@gitlab.foo.com"
            },
            "astitvasehgal19" :{
            "email" : "username2@gitlab.foo.com"
            },
            "prasad" : {
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

    template = {
        "key1": "stringval1",
        "key2": ["listval1", "listval2", "listval3"],
        "dictkey1":{
            "dict1key1": "stringval2",
            "dict2key2": ["listval1","listval3"],
            "dict3key3": {
                "key3":"stringval1",
                "key4":{
                    "listkey": ["listval2"]
                }
            }
        },
        "dictkey2": {
            "dict2key1" : {
                "key5": "stringval3",
                "key6": "listval1",
                "key7": ["listval2", "listval3"]
            },
            "dict2key2": "stringval2",
            "dict2key3": "listval2"
        } 
    }

    expected = {
        "key1": "one",
        "key2": ["foo", "bar", "qux"],
        "dictkey1":{
            "dict1key1": "two",
            "dict2key2": ["foo","qux"],
            "dict3key3": {
                "key3":"one",
                "key4":{
                    "listkey": ["bar"]
                }
            }
        },
        "dictkey2": {
            "dict2key1" : {
                "key5": "three",
                "key6": "foo",
                "key7": ["bar", "qux"]
            },
            "dict2key2": "two",
            "dict2key3": "bar"
        } 
    }

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

    data = {
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

    err = utils.exportYaml(data, 'src/test_units/compose.users.exp.yml')
    if err is not None:
        raise Exception(err)
    
    assert filecmp.cmp('src/test_units/compose.users.test.yml', 'src/test_units/compose.users.exp.yml')