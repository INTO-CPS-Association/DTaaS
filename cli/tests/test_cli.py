import subprocess


def test_add_user_cli():
    result =subprocess.run(["dtaas admin user add"], shell=True)
    assert result.returncode == 0

def test_delete_user_cli():
    result = subprocess.run(["dtaas admin user delete"], shell=True)
    assert result.returncode == 0