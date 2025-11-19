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
        "shm_size": "${shm_size}",
        "cpus": "${cpus}",
        "mem_limit": "${mem_limit}",
        "pids_limit": "${pids_limit}",
        "labels": [
            "traefik.enable=true",
            "traefik.http.routers.${username}.entryPoints=web",
            "traefik.http.routers.${username}.rule=PathPrefix(`/${username}`)",
            "traefik.http.routers.${username}.middlewares=traefik-forward-auth",
        ],
        "networks": ["users"],
    }

    template, err = utils.import_yaml("users.local.yml")
    if err is not None:
        raise Exception(err)

    assert template == expected


def test_import_yaml_compose():
    expected = get_test_compose_object()

    compose, err = utils.import_yaml("tests/data/compose.users.test.yml")
    if err is not None:
        raise Exception(err)
    assert expected == compose


def test_import_toml():
    toml, err = utils.import_toml("tests/dtaas.test.toml")
    if err is not None:
        raise Exception(err)

    expected = {
        "name": "Digital Twin as a Service (DTaaS)",
        "version": "0.2.0",
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
    template = get_replace_all_object(templateRandomVals)

    expectedRandomVals = ["one", "two", "three", "foo", "bar", "qux"]
    expected = get_replace_all_object(expectedRandomVals)

    mapping = {}
    for i in range(len(templateRandomVals)):
        mapping[templateRandomVals[i]] = expectedRandomVals[i]

    ans, err = utils.replace_all(template, mapping)
    if err is not None:
        raise Exception(err)

    assert ans == expected


def test_export_yaml():
    data = get_test_compose_object()

    err = utils.export_yaml(data, "tests/data/compose.users.exp.yml")
    if err is not None:
        raise Exception(err)

    expected, err1 = utils.import_yaml("tests/data/compose.users.test.yml")
    actual, err2 = utils.import_yaml("tests/data/compose.users.exp.yml")

    if err1:
        raise Exception(err1)
    if err2:
        raise Exception(err2)

    assert expected == actual


def get_replace_all_object(random_vals):
    obj = {
        "key1": random_vals[0],
        "key2": [random_vals[3], random_vals[4], random_vals[5]],
        "dictkey1": {
            "dict1key1": random_vals[1],
            "dict2key2": [random_vals[3], random_vals[5]],
            "dict3key3": {"key3": random_vals[0], "key4": {"listkey": [random_vals[4]]}},
        },
        "dictkey2": {
            "dict2key1": {
                "key5": random_vals[2],
                "key6": random_vals[3],
                "key7": [random_vals[4], random_vals[5]],
            },
            "dict2key2": random_vals[1],
            "dict2key3": random_vals[4],
        },
    }
    return obj


def get_test_compose_object():
    test_compose = {
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

    return test_compose
