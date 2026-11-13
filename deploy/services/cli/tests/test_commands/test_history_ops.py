"""Tests for user add-history, twin register and twin remove"""

from dtaas_services.cmd import services
from dtaas_services.commands import history_ops


def test_add_history_passes_group_and_projects(runner, mocker):
    """The options reach the setup"""
    setup = mocker.patch.object(
        history_ops, "setup_group_history", return_value=(True, "Group swim ready")
    )
    result = runner.invoke(
        services, ["user", "add-history", "-g", "swim", "-p", "SWiM", "-p", "Soil"]
    )
    assert result.exit_code == 0, result.output
    assert "Group swim ready" in result.output
    setup.assert_called_once_with("swim", ["SWiM", "Soil"], ())


def test_add_history_reports_a_failure(runner, mocker):
    """A failed setup ends with a non-zero exit code"""
    mocker.patch.object(
        history_ops, "setup_group_history", return_value=(False, "Invalid group")
    )
    result = runner.invoke(services, ["user", "add-history", "-g", "X", "-p", "S"])
    assert result.exit_code != 0
    assert "Invalid group" in result.output


def test_twin_register_reads_the_file(runner, mocker, twin_file_path):
    """The twin file path reaches the registration"""
    register = mocker.patch.object(
        history_ops, "register_twin", return_value=(True, "Registered 1 device(s)")
    )
    result = runner.invoke(services, ["twin", "register", "-f", str(twin_file_path)])
    assert result.exit_code == 0, result.output
    register.assert_called_once_with(twin_file_path)


def test_twin_register_needs_an_existing_file(runner, tmp_path):
    """A missing file is refused by the option"""
    result = runner.invoke(
        services, ["twin", "register", "-f", str(tmp_path / "none.json")]
    )
    assert result.exit_code != 0
    assert "does not exist" in result.output


def test_twin_remove_passes_group_and_twin(runner, mocker):
    """The group and the twin reach the removal"""
    remove = mocker.patch.object(
        history_ops, "remove_twin", return_value=(False, "still has a consumer")
    )
    result = runner.invoke(services, ["twin", "remove", "-g", "swim", "-t", "room"])
    assert result.exit_code != 0
    assert "still has a consumer" in result.output
    remove.assert_called_once_with("swim", "room")


def test_add_history_passes_the_owners(runner, mocker):
    """Each --owner reaches the setup"""
    setup = mocker.patch.object(
        history_ops, "setup_group_history", return_value=(True, "ok")
    )
    result = runner.invoke(
        services,
        ["user", "add-history", "-g", "swim", "-p", "SWiM", "-o", "jady", "-o", "bob"],
    )
    assert result.exit_code == 0, result.output
    setup.assert_called_once_with("swim", ["SWiM"], ("jady", "bob"))
