from src.pkg import utils


def test_import_yaml_users():
    expected = {
        "image": "mltooling/ml-workspace-minimal:0.13.2",
        "restart": "unless-stopped",
        "volumes": [
            "${DTAAS_DIR}/files/common:/workspace/common",
            "${DTAAS_DIR}/files/${username}:/workspace",
        ],
        "environment": ["AUTHENTICATE_VIA_JUPYTER=", "WORKSPACE_BASE_URL=${username}"],
        "shm_size": "512m",
        "labels": [
            "traefik.enable=true",
            "traefik.http.routers.${username}.entryPoints=web",
            "traefik.http.routers.${username}.rule=PathPrefix(`/${username}`)",
            "traefik.http.routers.${username}.middlewares=traefik-forward-auth",
        ],
        "networks": ["users"],
    }

    template, err = utils.importYaml("users.local.yml")
    if err is not None:
        raise Exception(err)

    assert template == expected


def test_import_yaml_compose():
    expected = getTestComposeObject()

    compose, err = utils.importYaml("tests/data/compose.users.test.yml")
    if err is not None:
        raise Exception(err)
    assert expected == compose


def test_import_toml():
    toml, err = utils.importToml("tests/dtaas.test.toml")
    if err is not None:
        raise Exception(err)

    expected = {
        "name": "Digital Twin as a Service (DTaaS)",
        "version": "0.1.2",
        "owner": "The INTO-CPS-Association",
        "git-repo": "https://github.com/into-cps-association/DTaaS.git",
        "common": {
            # absolute path to the DTaaS application directory
            "server-dns": "localhost",
            "path": "/home/Desktop/DTaaS",
        },
        "users": {
            # matching user info must present in this config file
            "add": ["username1", "username2", "username3"],
            "delete": ["username2", "username3"],
            "username1": {"email": "username1@gitlab.foo.com"},
            "username2": {"email": "username2@gitlab.foo.com"},
            "username3": {"email": "username3@gitlab.foo.com"},
        },
        "client": {"web": {"config": "/home/Desktop/DTaaS/env.local.js"}},
    }

    assert expected == toml


def test_replace_all():
    templateRandomVals = [
        "stringval1",
        "stringval2",
        "stringval3",
        "listval1",
        "listval2",
        "listval3",
    ]
    template = getReplaceAllObject(templateRandomVals)

    expectedRandomVals = ["one", "two", "three", "foo", "bar", "qux"]
    expected = getReplaceAllObject(expectedRandomVals)

    mapping = {}
    for i in range(len(templateRandomVals)):
        mapping[templateRandomVals[i]] = expectedRandomVals[i]

    ans, err = utils.replaceAll(template, mapping)
    if err is not None:
        raise Exception(err)

    assert ans == expected


def test_export_yaml():
    data = getTestComposeObject()

    err = utils.exportYaml(data, "tests/data/compose.users.exp.yml")
    if err is not None:
        raise Exception(err)

    expected, err1 = utils.importYaml("tests/data/compose.users.test.yml")
    actual, err2 = utils.importYaml("tests/data/compose.users.exp.yml")

    if err1:
        raise Exception(err1)
    if err2:
        raise Exception(err2)

    assert expected == actual


def getReplaceAllObject(randomVals):
    obj = {
        "key1": randomVals[0],
        "key2": [randomVals[3], randomVals[4], randomVals[5]],
        "dictkey1": {
            "dict1key1": randomVals[1],
            "dict2key2": [randomVals[3], randomVals[5]],
            "dict3key3": {"key3": randomVals[0], "key4": {"listkey": [randomVals[4]]}},
        },
        "dictkey2": {
            "dict2key1": {
                "key5": randomVals[2],
                "key6": randomVals[3],
                "key7": [randomVals[4], randomVals[5]],
            },
            "dict2key2": randomVals[1],
            "dict2key3": randomVals[4],
        },
    }

    return obj


def getTestComposeObject():
    testCompose = {
        "version": "3",
        "services": {
            "testuser": {
                "image": "mltooling/ml-workspace-minimal:0.13.2",
                "volumes": [
                    "/home/testuser/DTaaS/files/common:/workspace/common",
                    "/home/testuser/DTaaS/files/testuser:/workspace",
                ],
                "environment": [
                    "AUTHENTICATE_VIA_JUPYTER=",
                    "WORKSPACE_BASE_URL=testuser",
                ],
                "shm_size": "512m",
                "labels": [
                    "traefik.enable=true",
                    "traefik.http.routers.testuser.entryPoints=web",
                    "traefik.http.routers.testuser.rule=PathPrefix(`/testuser`)",
                    "traefik.http.routers.testuser.middlewares=traefik-forward-auth",
                ],
                "networks": ["users"],
            }
        },
        "networks": {
            "users": {
                "name": "dtaas-users",
                "external": True,
            }
        },
    }

    return testCompose
