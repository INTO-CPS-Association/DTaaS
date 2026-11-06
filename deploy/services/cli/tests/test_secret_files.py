"""Tests for the secret files of program accounts"""

import stat
from dtaas_services.pkg import secret_files



def test_secret_path_follows_the_naming_convention(base_dir):
    """The file is secrets/<consumer>/<service>_<account>_password"""
    path = secret_files.secret_path("signals", "rabbitmq", "dtaas_signals")
    assert path == base_dir / "secrets" / "signals" / "rabbitmq_dtaas_signals_password"


def test_ensure_password_writes_a_random_password_with_mode_600(base_dir):
    """A new password is long, random and readable by the owner only"""
    password = secret_files.ensure_password("signals", "rabbitmq", "dtaas_signals")
    path = secret_files.secret_path("signals", "rabbitmq", "dtaas_signals")
    assert len(password) >= 40
    assert path.read_text(encoding="utf-8") == password
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert base_dir in path.parents


def test_ensure_password_keeps_an_existing_password(base_dir):
    """A second run reads the password back instead of making a new one"""
    first = secret_files.ensure_password("signals", "rabbitmq", "dtaas_signals")
    second = secret_files.ensure_password("signals", "rabbitmq", "dtaas_signals")
    assert first == second
    assert base_dir.exists()


def test_ensure_password_differs_per_account(base_dir):
    """Two accounts never share a password"""
    one = secret_files.ensure_password("telegraf", "rabbitmq", "swim_telegraf")
    two = secret_files.ensure_password("telegraf", "postgresql", "swim_telegraf")
    assert one != two
    assert base_dir.exists()
