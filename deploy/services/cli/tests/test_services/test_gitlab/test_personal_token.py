"""Tests for GitLab Personal Access Token creation (personal_token.py)."""

from dtaas_services.pkg.services.gitlab import personal_token as pt
# pylint: disable=W0212


def test_parse_token_from_output_too_short():
    """Test parsing when token is too short (< 10 chars)."""
    output = "short\n"
    assert pt._parse_token_from_output(output) is None


def test_execute_rails_command_success(mocker):
    """Test successful rails command execution."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token.execute_docker_command",
        return_value=(True, "glpat-token12345678"),
    )
    success, output = pt._execute_rails_command()
    assert success is True
    assert "glpat" in output


def test_extract_and_validate_token_parse_failure():
    """Test token extraction when parsing fails."""
    output = ""
    success, msg = pt._extract_and_validate_token(output)
    assert success is False
    assert "Could not parse token" in msg


def test_create_personal_access_token_success(mocker):
    """Test full PAT creation flow."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._execute_rails_command",
        return_value=(True, "glpat-realtoken12345678"),
    )
    success, token = pt.create_personal_access_token()
    assert success is True
    assert token == "glpat-realtoken12345678"


def test_create_personal_access_token_exec_failure(mocker):
    """Test PAT creation when docker exec fails."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.personal_token._execute_rails_command",
        return_value=(False, "error: gitlab not running"),
    )
    success, msg = pt.create_personal_access_token()
    assert success is False
    assert "Failed to create Personal Access Token" in msg
