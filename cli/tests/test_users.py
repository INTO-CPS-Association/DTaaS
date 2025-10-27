import pytest
from pathlib import Path
from src.pkg import users
from unittest.mock import patch, MagicMock
import tempfile


@pytest.fixture
def mock_config():
    """Mock config object"""
    mock = MagicMock()
    mock.getAddUsersList.return_value = (["user1"], None)
    mock.getDeleteUsersList.return_value = (["user1"], None)
    mock.getServerDNS.return_value = ("localhost", None)
    mock.getPath.return_value = ("/test/path", None)
    return mock


@pytest.fixture
def mock_utils():
    """Mock all utils functions"""
    with patch("src.pkg.users.utils.importYaml") as mi, patch(
        "src.pkg.users.utils.exportYaml"
    ) as me, patch("src.pkg.users.utils.replaceAll") as mr:
        mi.return_value = ({"version": "3", "services": {}}, None)
        me.return_value = None
        mr.return_value = ({"image": "test"}, None)
        yield {"import": mi, "export": me, "replace": mr}


@pytest.fixture
def mock_user_operations():
    """Mock user operation functions"""
    with patch("src.pkg.users.createUserFiles") as mc, patch(
        "src.pkg.users.addUsersToCompose"
    ) as ma, patch("src.pkg.users.startUserContainers") as ms, patch(
        "src.pkg.users.stopUserContainers"
    ) as mst:
        mc.return_value = ma.return_value = ms.return_value = mst.return_value = None
        yield {"create": mc, "add": ma, "start": ms, "stop": mst}


@pytest.fixture
def temp_dir_with_template():
    """Temporary directory with template folder"""
    with tempfile.TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "template").mkdir(parents=True, exist_ok=True)
        (Path(tmpdir) / "template" / "test.txt").write_text("test")
        yield tmpdir


@pytest.mark.parametrize("usernames", [["testuser"], ["user1", "user2", "user3"], []])
def test_create_user_files(temp_dir_with_template, usernames):
    assert users.createUserFiles(usernames, temp_dir_with_template) is None
    assert all(Path(temp_dir_with_template, u).exists() for u in usernames)


def test_create_user_files_already_exists(temp_dir_with_template):
    Path(temp_dir_with_template, "testuser").mkdir(parents=True)
    assert users.createUserFiles(["testuser"], temp_dir_with_template) is None


def test_add_users_to_compose(mock_utils):
    users.addUsersToCompose(
        ["user1", "user2", "user3"], {"services": {}}, "localhost", "/test"
    )
    assert mock_utils["replace"].call_count == 3


def test_add_users_to_compose_config_error():
    with patch(
        "src.pkg.users.getComposeConfig", return_value=(None, Exception("Error"))
    ):
        assert (
            users.addUsersToCompose(["user1"], {"services": {}}, "localhost", "/test")
            is not None
        )


@pytest.mark.parametrize(
    "server,file", [("localhost", "users.local.yml"), ("foo.com", "users.server.yml")]
)
def test_get_compose_config(mock_utils, server, file):
    result, err = users.getComposeConfig("testuser", server, "/test")
    assert mock_utils["import"].called
    mock_utils["import"].assert_called_with(file)


def test_get_compose_config_error():
    with patch(
        "src.pkg.users.utils.importYaml", return_value=(None, Exception("Error"))
    ):
        result, err = users.getComposeConfig("testuser", "localhost", "/test")
        assert (result, isinstance(err, Exception)) == (None, True)


@pytest.mark.parametrize("func", [users.startUserContainers, users.stopUserContainers])
@patch("src.pkg.users.subprocess.run", return_value=MagicMock(returncode=0))
def test_container_operations(mock_run, func):
    func(["user1", "user2"])
    assert mock_run.called


@pytest.mark.parametrize("returncode,has_error", [(0, False), (1, True)])
@patch("src.pkg.users.subprocess.run")
def test_run_command_for_containers(mock_run, returncode, has_error):
    mock_run.return_value = MagicMock(
        returncode=returncode, stderr="Error" if has_error else ""
    )
    assert (users.runCommandForContainers("up", ["user1"]) is not None) == has_error


# addUsers tests
@pytest.mark.parametrize(
    "compose,field", [({"services": {}}, "version"), ({"version": "3"}, "services")]
)
def test_add_users_missing_fields(
    mock_config, mock_utils, mock_user_operations, compose, field
):
    mock_utils["import"].return_value = (compose, None)
    assert users.addUsers(mock_config) is None and field in compose


def test_add_users_export_error(mock_config, mock_utils, mock_user_operations):
    mock_utils["export"].return_value = Exception("Export failed")
    assert users.addUsers(mock_config) is not None


# deleteUser tests
@pytest.mark.parametrize("export_error", [False, True])
def test_delete_user(mock_config, mock_utils, mock_user_operations, export_error):
    compose = {"version": "3", "services": {"user1": {}, "user2": {}}}
    mock_config.getDeleteUsersList.return_value = (["user1"], None)
    mock_utils["import"].return_value = (compose, None)
    mock_utils["export"].return_value = Exception("Failed") if export_error else None

    err = users.deleteUser(mock_config)
    assert (err is not None) if export_error else err is None
