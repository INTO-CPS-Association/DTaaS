"""Tests for the deployment-generation helpers in cmd_deploy_utils.py."""

from unittest.mock import MagicMock, patch
import click
import pytest
from src.pkg.certs import CertsCopySpec
from src.cmd_deploy_utils import (
    VerticalChoicesCommand,
    _copy_deploy_certs,
    _create_user_dirs,
    _substitute_config,
    apply_deploy_config,
    provision_user_files,
)


def test_param_rows_skips_hidden_param():
    """_param_rows returns no rows for a param with no help record (hidden)."""
    param = MagicMock()
    param.get_help_record.return_value = None

    rows = VerticalChoicesCommand._param_rows(param, ctx=None)  # pylint: disable=protected-access
    assert not rows


def test_param_rows_expands_choice_options():
    """_param_rows lists each Choice value on its own row."""
    cmd = VerticalChoicesCommand(name="x", add_help_option=False)
    ctx = click.Context(cmd)
    param = click.Option(["--type"], type=click.Choice(["a", "b"]), help="Pick one")

    rows = VerticalChoicesCommand._param_rows(param, ctx)  # pylint: disable=protected-access
    assert rows[0][1] == "Pick one. One of:"
    assert rows[1:] == [("", "a"), ("", "b")]


def test_format_help_text_writes_help():
    """format_help_text writes the command's help string when present."""
    cmd = VerticalChoicesCommand(
        name="x", help="Some help text.", add_help_option=False
    )
    formatter = click.HelpFormatter()

    cmd.format_help_text(click.Context(cmd), formatter)
    assert "Some help text." in formatter.getvalue()


def test_format_options_writes_section_when_rows_present():
    """format_options renders an Options section when a param has a help row."""
    param = click.Option(["--force"], is_flag=True, help="Overwrite files.")
    cmd = VerticalChoicesCommand(name="x", params=[param], add_help_option=False)
    formatter = click.HelpFormatter()

    cmd.format_options(click.Context(cmd), formatter)
    output = formatter.getvalue()
    assert "Options" in output
    assert "--force" in output


def test_provision_user_files_noop_when_users_not_a_list(tmp_path):
    """provision_user_files skips dir creation when 'users' is malformed (not a list)."""
    (tmp_path / "dtaas.toml").write_text(
        '[users]\nadd=["alice"]\n[users.alice]\nemail="a@intocps.org"\n'
    )
    with patch(
        "src.cmd_deploy_utils.projectPkg.create_user_dirs"
    ) as mock_create, patch(
        "src.cmd_deploy_utils.projectPkg.set_files_permissions"
    ) as mock_perms:
        provision_user_files(str(tmp_path))

    mock_create.assert_not_called()
    mock_perms.assert_called_once_with(str(tmp_path))


def test_provision_user_files_noop_without_toml(tmp_path, monkeypatch):
    """provision_user_files does nothing when no dtaas.toml is present."""
    monkeypatch.chdir(tmp_path)  # no dtaas.toml in output dir or cwd
    with patch(
        "src.cmd_deploy_utils.projectPkg.create_user_dirs"
    ) as mock_create, patch(
        "src.cmd_deploy_utils.projectPkg.set_files_permissions"
    ) as mock_perms:
        provision_user_files(str(tmp_path))

    mock_create.assert_not_called()
    mock_perms.assert_not_called()


@pytest.fixture
def broken_toml_dir(tmp_path):
    """A directory containing an unparsable dtaas.toml."""
    (tmp_path / "dtaas.toml").write_text("key = = =")
    return tmp_path


def test_provision_user_files_maps_parse_error(broken_toml_dir):
    """provision_user_files surfaces a dtaas.toml parse error as a ClickException."""
    output_dir = str(broken_toml_dir)
    with pytest.raises(click.ClickException, match="Error reading dtaas.toml"):
        provision_user_files(output_dir)


def test_create_user_dirs_maps_oserror():
    """_create_user_dirs wraps a directory-creation failure as a ClickException."""
    toml_data = {"users": [{"username": "alice"}]}
    with patch(
        "src.cmd_deploy_utils.projectPkg.create_user_dirs",
        side_effect=OSError("no space left"),
    ):
        with pytest.raises(click.ClickException, match="no space left"):
            _create_user_dirs("/out", toml_data)


def test_create_user_dirs_filters_unsafe_usernames():
    """Only safe usernames reach create_user_dirs; path-unsafe ones are dropped."""
    toml_data = {
        "users": [
            {"username": "alice"},
            {"username": ".."},  # path traversal
            {"username": "a/b"},  # path separator
            {"username": "bad name"},  # whitespace
            {"username": "bob.smith"},  # dots are allowed mid-name
        ]
    }
    with patch("src.cmd_deploy_utils.projectPkg.create_user_dirs") as mock_create:
        _create_user_dirs("/out", toml_data)

    mock_create.assert_called_once_with("/out", ["alice", "bob.smith"])


def test_create_user_dirs_noop_when_all_usernames_unsafe():
    """When every username is unsafe, create_user_dirs is never called."""
    toml_data = {"users": [{"username": ".."}, {"username": "a/b"}]}
    with patch("src.cmd_deploy_utils.projectPkg.create_user_dirs") as mock_create:
        _create_user_dirs("/out", toml_data)

    mock_create.assert_not_called()


def test_substitute_config_maps_errors_to_click_exception():
    """_substitute_config wraps build/apply failures as a ClickException."""
    with patch(
        "src.cmd_deploy_utils.deployConfigPkg.build_file_specs",
        side_effect=ValueError("bad value"),
    ):
        with pytest.raises(click.ClickException, match="bad value"):
            _substitute_config("secure-server", "/out", {})


def test_substitute_config_echoes_placeholder_warnings(capsys):
    """_substitute_config prints any unresolved-placeholder warnings."""
    with patch(
        "src.cmd_deploy_utils.deployConfigPkg.build_file_specs", return_value=[]
    ), patch("src.cmd_deploy_utils.deployConfigPkg.apply_config"), patch(
        "src.cmd_deploy_utils.deployConfigPkg.check_placeholders",
        return_value=["Warning: unresolved placeholder"],
    ):
        _substitute_config("secure-server", "/out", {})

    assert "Warning: unresolved placeholder" in capsys.readouterr().out


def test_copy_deploy_certs_echoes_note(capsys):
    """_copy_deploy_certs prints the note returned by certsPkg.copy_certs."""
    spec = CertsCopySpec("secure-server", "/certs-src", False)
    with patch("src.cmd_deploy_utils.certsPkg.copy_certs", return_value="Copied certs"):
        _copy_deploy_certs("/out", spec)

    assert "Copied certs" in capsys.readouterr().out


def test_copy_deploy_certs_maps_oserror():
    """_copy_deploy_certs wraps a copy failure as a ClickException."""
    spec = CertsCopySpec("secure-server", "/certs-src", False)
    with patch(
        "src.cmd_deploy_utils.certsPkg.copy_certs", side_effect=OSError("disk full")
    ):
        with pytest.raises(click.ClickException, match="disk full"):
            _copy_deploy_certs("/out", spec)


def test_apply_deploy_config_notes_missing_toml(tmp_path, monkeypatch, capsys):
    """apply_deploy_config prints a note and does nothing when dtaas.toml is absent."""
    monkeypatch.chdir(tmp_path)  # no dtaas.toml in output dir or cwd

    apply_deploy_config("secure-server", str(tmp_path))

    assert "dtaas.toml not found" in capsys.readouterr().out


def test_apply_deploy_config_maps_parse_error(broken_toml_dir):
    """apply_deploy_config surfaces a dtaas.toml parse error as a ClickException."""
    output_dir = str(broken_toml_dir)
    with pytest.raises(click.ClickException, match="Error reading dtaas.toml"):
        apply_deploy_config("secure-server", output_dir)


def test_apply_deploy_config_runs_full_pipeline(tmp_path):
    """apply_deploy_config substitutes config, creates user dirs, and copies certs."""
    (tmp_path / "dtaas.toml").write_text('[[users]]\nusername="alice"\n')
    with patch(
        "src.cmd_deploy_utils.deployConfigPkg.build_file_specs", return_value=[]
    ), patch("src.cmd_deploy_utils.deployConfigPkg.apply_config") as mock_apply, patch(
        "src.cmd_deploy_utils.deployConfigPkg.check_placeholders", return_value=[]
    ), patch("src.cmd_deploy_utils.projectPkg.create_user_dirs") as mock_create, patch(
        "src.cmd_deploy_utils.certsPkg.copy_certs", return_value=""
    ) as mock_copy:
        apply_deploy_config("secure-server", str(tmp_path))

    mock_apply.assert_called_once()
    mock_create.assert_called_once_with(str(tmp_path), ["alice"])
    mock_copy.assert_called_once()
