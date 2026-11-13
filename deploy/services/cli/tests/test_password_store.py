"""Tests for pkg/password_store.py"""

import pytest
from dtaas_services.pkg import password_store as ps
from dtaas_services.pkg.file_lock import lock_path
from dtaas_services.pkg.utils import permission_hint
from tests.conftest import denied, run_together
# pylint: disable=W0621


@pytest.fixture(autouse=True)
def patch_base_dir(tmp_path, mocker):
    """Redirect Config.get_base_dir() to a temp directory for every test."""
    mocker.patch(
        "dtaas_services.pkg.password_store.Config.get_base_dir",
        return_value=tmp_path,
    )
    return tmp_path


def test_get_current_password_missing_file():
    """Returns default when the passwords file does not exist."""
    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == ""
    assert (
        ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD", "fallback")
        == "fallback"
    )


def test_remove_service_passwords_unknown_service():
    """Service name that has no registered keys."""
    ps.save_password("TB_SYSADMIN_CURRENT_PASSWORD", "val")
    ps.remove_service_passwords("unknown_service")
    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == "val"


def test_remove_service_passwords_file_absent():
    """(no error) when the passwords file does not exist."""
    ps.remove_service_passwords("thingsboard")


def test_remove_service_passwords_thingsboard():
    """Removes ThingsBoard keys, leaves others intact."""
    ps.save_password("TB_SYSADMIN_CURRENT_PASSWORD", "syspass")
    ps.save_password("TB_TENANT_ADMIN_CURRENT_PASSWORD", "tenantpass")
    ps.save_password("GITLAB_ROOT_CURRENT_PASSWORD", "gitpass")

    ps.remove_service_passwords("thingsboard")

    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("TB_TENANT_ADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("GITLAB_ROOT_CURRENT_PASSWORD") == "gitpass"


def test_remove_service_passwords_thingsboard_ce_alias():
    """'thingsboard-ce' alias cleans up the same TB keys."""
    ps.save_password("TB_SYSADMIN_CURRENT_PASSWORD", "syspass")
    ps.save_password("TB_TENANT_ADMIN_CURRENT_PASSWORD", "tenantpass")
    ps.save_password("GITLAB_ROOT_CURRENT_PASSWORD", "gitpass")

    ps.remove_service_passwords("thingsboard-ce")

    assert ps.get_current_password("TB_SYSADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("TB_TENANT_ADMIN_CURRENT_PASSWORD") == ""
    assert ps.get_current_password("GITLAB_ROOT_CURRENT_PASSWORD") == "gitpass"


@pytest.mark.usefixtures("posix_hints")
@pytest.mark.parametrize(
    "call,patched,locks",
    [
        (
            lambda: ps.get_current_password("GITLAB_ROOT_CURRENT_PASSWORD"),
            "dotenv_values",
            False,
        ),
        (lambda: ps.remove_service_passwords("gitlab"), "unset_key", True),
    ],
    ids=["read", "remove"],
)
def test_a_file_owned_by_root_reports_the_fix(
    patch_base_dir, mocker, call, patched, locks
):
    """'service install' runs as root and writes the file as root 0600. Every
    later read or write by the admin says so and gives the chown command,
    which also names the lock file a change holds."""
    path = patch_base_dir / "config" / ps.PASSWORDS_FILE
    path.parent.mkdir(parents=True)
    path.write_text("", encoding="utf-8")
    mocker.patch(f"dtaas_services.pkg.password_store.{patched}", side_effect=denied(path))
    with pytest.raises(PermissionError) as caught:
        call()
    files = (path, lock_path(path)) if locks else (path,)
    assert str(caught.value) == permission_hint(*files)


def _not_recorded(key, why):
    """The message of a password *key* that could not be recorded."""
    return (
        f"{key} could not be recorded. The service already uses the password "
        f"set by {ps.SOURCE_KEYS[key]} in config/services.env: add the line "
        f"{key}=<that password> to config/password.env.current by hand. "
        f"Why: {why}"
    )


@pytest.mark.usefixtures("posix_hints")
def test_a_password_that_root_keeps_from_being_saved_is_reported(
    patch_base_dir, mocker
):
    """The service already uses the password, so the failure says which key
    of services.env holds it and what to add by hand, with the chown that
    fixes the file and its lock, and never shows the password."""
    path = patch_base_dir / "config" / ps.PASSWORDS_FILE
    path.parent.mkdir(parents=True)
    path.write_text("", encoding="utf-8")
    mocker.patch(
        "dtaas_services.pkg.password_store.set_key", side_effect=denied(path)
    )
    expected = _not_recorded(
        "GITLAB_ROOT_CURRENT_PASSWORD", permission_hint(path, lock_path(path))
    )
    with pytest.raises(ps.PasswordNotRecorded) as caught:
        ps.save_password("GITLAB_ROOT_CURRENT_PASSWORD", "secret-value")
    assert str(caught.value) == expected
    assert "secret-value" not in str(caught.value)
    assert isinstance(caught.value.__cause__, PermissionError)


@pytest.mark.parametrize("key", sorted(ps.SOURCE_KEYS))
def test_a_lock_held_too_long_names_the_key_of_the_password(mocker, key):
    """A lock another command held past the wait is reported for every
    recorded password with the services.env key that holds it, and is no
    OSError, so a handler of connection errors never takes it for one."""
    timeout = TimeoutError("its lock was not released within 30 seconds.")
    mocker.patch("dtaas_services.pkg.password_store.locked", side_effect=timeout)
    with pytest.raises(ps.PasswordNotRecorded) as caught:
        ps.save_password(key, "secret-value")
    assert str(caught.value) == _not_recorded(key, timeout)
    assert caught.value.__cause__ is timeout
    assert not isinstance(caught.value, OSError)


def test_passwords_saved_at_the_same_time_are_all_kept():
    """Two commands recording passwords at once take turns on the file's
    lock, so neither loses the other's entries."""
    names = {
        prefix: [f"{prefix.upper()}_{index}" for index in range(15)] for prefix in "ab"
    }

    def save_all(prefix):
        for key in names[prefix]:
            ps.save_password(key, f"value-{key}")

    run_together(save_all, "ab")

    for key in names["a"] + names["b"]:
        assert ps.get_current_password(key) == f"value-{key}"
