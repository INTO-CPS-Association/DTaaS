from src.pkg import utils
import subprocess


def test_add_user_cli():
    #integration test: to be run with empty & filled add user list in dtaas.toml
    result =subprocess.run(["dtaas admin user add"], shell=True)
    assert result.returncode == 0

def test_delete_user_cli():
    #integration test: to be run with empty & filled delete user list in dtaas.toml
    result = subprocess.run(["dtaas admin user delete"], shell=True)
    assert result.returncode == 0