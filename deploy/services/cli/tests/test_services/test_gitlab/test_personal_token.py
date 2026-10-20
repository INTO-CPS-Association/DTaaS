"""Tests for GitLab Personal Access Token creation (personal_token.py)."""

import json

import pytest

from dtaas_services.pkg.services.gitlab import personal_token as pt

# pylint: disable=W0212,W0621

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR


@pytest.fixture
def mock_docker_exec(mocker):
    """Mock the docker exec call that runs gitlab-rails"""
    return mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.execute_docker_command"
    )


def test_pat_script_revokes_old_tokens_before_creating():
    """The script revokes root's active dtaas-services PATs, then creates one"""
    revoke = pt.PAT_SCRIPT.index(".each(&:revoke!)")
    create = pt.PAT_SCRIPT.index("create!(")
    assert "User.find(1)" in pt.PAT_SCRIPT
    assert f"active.where(name: '{pt.PAT_NAME}')" in pt.PAT_SCRIPT
    assert revoke < create
    assert "scopes: ['api']" in pt.PAT_SCRIPT


def test_create_pat_runs_rails_without_printing(mock_docker_exec):
    """The token comes from gitlab-rails stdout; nothing is echoed"""
    mock_docker_exec.return_value = (True, f"warning: x\n{pt.PAT_MARKER}{TEST_TOKEN}\n")
    assert pt.create_pat() == (True, TEST_TOKEN)
    container, cmd, options = mock_docker_exec.call_args.args
    assert container == "gitlab"
    assert cmd == ["gitlab-rails", "runner", pt.PAT_SCRIPT]
    assert options.verbose is False


def test_create_pat_docker_failure(mock_docker_exec):
    """A failed gitlab-rails call is reported with its error"""
    mock_docker_exec.return_value = (False, "Docker error: ActiveRecord::RecordInvalid")
    success, msg = pt.create_pat()
    assert success is False
    assert "gitlab-rails runner" in msg
    assert "RecordInvalid" in msg


@pytest.mark.parametrize("output", ["", "done\n", f"{pt.PAT_MARKER}\n"])
def test_create_pat_without_token_in_output(mock_docker_exec, output):
    """Output without a marked, non empty token is a failure"""
    mock_docker_exec.return_value = (True, output)
    assert pt.create_pat() == (False, "No token in the gitlab-rails runner output")


def test_read_tokens_file_empty_pat(tmp_path):
    """Test reading tokens file with empty PAT."""
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text(json.dumps({"personal_access_token": ""}), encoding="utf-8")
    success, msg = pt._read_tokens_file(tokens_file)
    assert success is False
    assert "empty" in msg


def test_read_tokens_file_invalid_json(tmp_path):
    """Test reading tokens file with invalid JSON."""
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text("not valid json{{{", encoding="utf-8")
    success, msg = pt._read_tokens_file(tokens_file)
    assert success is False
    assert "Failed to read token file" in msg


def test_load_pat_from_tokens_success(mocker, tmp_path):
    """Test loading PAT when file exists."""
    tokens_file = tmp_path / "config" / "gitlab_tokens.json"
    tokens_file.parent.mkdir(parents=True)
    tokens_file.write_text(
        json.dumps({"personal_access_token": TEST_TOKEN}), encoding="utf-8"
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._get_tokens_path",
        return_value=tokens_file,
    )
    success, pat = pt._load_pat_from_tokens()
    assert success is True
    assert pat == TEST_TOKEN
