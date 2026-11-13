"""Fixtures and helpers shared by the tests: the generated project of the
project generation and force overwrite tests, a denied access, the
permission hints on every platform, and threads run at once."""

# pylint: disable=redefined-outer-name
import threading

import pytest
from dtaas_services.pkg.template import generate_project_structure

KEPT_ENV = "HOSTNAME=kept.example"


@pytest.fixture
def package_root(tmp_path):
    """Package root with a minimal templates folder"""
    root = tmp_path / "package"
    templates_root = root / "templates"
    (templates_root / "config").mkdir(parents=True)
    (templates_root / "config" / "services.env.template").write_text("ENV=value")
    (templates_root / "config" / "credentials.csv.template").write_text("user,pass")
    (templates_root / "config" / "gitlab_oauth.json.template").write_text("[]")
    # A nested, unprotected config file, so copytree recurses one level down
    (templates_root / "config" / "nested").mkdir()
    (templates_root / "config" / "nested" / "extra.conf").write_text("packaged")
    (templates_root / "data").mkdir()
    (templates_root / "compose.services.yml").write_text("version: '3'")
    return root


@pytest.fixture
def edited_project(tmp_path, package_root):
    """Generated project whose package and user files were edited afterwards"""
    target_dir = tmp_path / "project"
    generate_project_structure(target_dir, package_root)
    (target_dir / "compose.services.yml").write_text("edited")
    (target_dir / "config" / "services.env.template").write_text("edited")
    (target_dir / "config" / "services.env").write_text(KEPT_ENV)
    return target_dir


def denied(path) -> PermissionError:
    """The error open() raises for a file that belongs to another user."""
    return PermissionError(13, "Permission denied", str(path))


@pytest.fixture
def posix_hints(mocker):
    """Give the permission hints of Linux and macOS on every platform, so a
    test of a hint also runs on Windows, which has no root and no hint."""
    mocker.patch("dtaas_services.pkg.utils._hints_apply", return_value=True)


def run_together(work, args):
    """Run work(arg) for each of *args* in its own thread, all at once, and
    wait for them: a failure in any thread fails the test."""
    errors = []

    def guarded(arg):
        try:
            work(arg)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            errors.append(exc)

    threads = [threading.Thread(target=guarded, args=(arg,)) for arg in args]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert not errors, errors
