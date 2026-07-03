"""Tests for the config_validate module."""

import copy
import pytest
from src.pkg.config_validate import collect_errors, validate_config
from src.pkg.project import generate_config


@pytest.fixture
def base(tmp_path):
    """A valid config whose path/certs-src point at an existing directory."""
    existing = str(tmp_path)
    return {
        "git-repo": "https://github.com/into-cps-association/DTaaS.git",
        "common": {
            "server-dns": "localhost",
            "path": existing,
            "security": {"certs-src": existing},
            "resources": {
                "cpus": 4,
                "pids_limit": 4960,
                "mem_limit": "4G",
                "shm_size": "512m",
            },
        },
        "users": {
            "starting": ["u1", "u2"],
            "u1": {
                "email": "u1@intocps.org",
                "groups": ["default"],
                "load_balance": True,
            },
            "u2": {"email": "u2@intocps.org"},
        },
    }


def with_common(base, **changes):
    """Return a deep copy of *base* with common-section keys overridden."""
    data = copy.deepcopy(base)
    data["common"].update(changes)
    return data


def test_valid_config_has_no_errors(base):
    """A fully populated, correct config produces no problems."""
    assert collect_errors(base) == []


def test_git_repo_missing_and_invalid(base):
    """git-repo must be present and a clean URL (stray '@@' is rejected)."""
    no_repo = copy.deepcopy(base)
    del no_repo["git-repo"]
    assert "git-repo is missing" in collect_errors(no_repo)

    bad = copy.deepcopy(base)
    bad["git-repo"] = "https://github.com/into-cps-association/DTaaS.git..cs@@"
    assert "git-repo must be a valid URL" in collect_errors(bad)

    bad["git-repo"] = 123  # non-string
    assert "git-repo must be a valid URL" in collect_errors(bad)


def test_url_scheme_is_case_insensitive(base):
    """An upper-case scheme (HTTPS://) is still accepted as a valid URL."""
    ok = copy.deepcopy(base)
    ok["git-repo"] = "HTTPS://github.com/into-cps-association/DTaaS.git"
    assert "git-repo must be a valid URL" not in collect_errors(ok)


def test_server_dns_validation(base):
    """localhost, IPs and FQDNs pass; a bare single-label name is rejected."""
    msg = "common.server-dns must be a valid hostname or IP address"

    assert collect_errors(with_common(base, **{"server-dns": "lossscalhost"})) == [msg]
    assert collect_errors(with_common(base, **{"server-dns": 123})) == [msg]
    # A dotted-numeric value that is not a valid IP is rejected, not read as a host.
    assert collect_errors(with_common(base, **{"server-dns": "999.999.999.999"})) == [
        msg
    ]
    assert msg not in collect_errors(with_common(base, **{"server-dns": "localhost"}))
    assert msg not in collect_errors(with_common(base, **{"server-dns": "intocps.org"}))
    assert msg not in collect_errors(
        with_common(base, **{"server-dns": "192.168.1.1"})  # NOSONAR
    )  # NOSONAR


def test_path_must_exist(base, tmp_path):
    """common.path must be an absolute path to a directory that exists."""
    msg = "common.path must be an absolute path to an existing directory"

    assert collect_errors(with_common(base, path="relative/dir")) == [msg]
    assert collect_errors(with_common(base, path=str(tmp_path / "missing"))) == [msg]
    assert collect_errors(with_common(base, path=123)) == [msg]
    # The fixture's path (tmp_path) exists, so the valid config has no path error.
    assert msg not in collect_errors(base)


def test_certs_src_optional_but_must_exist_when_present(base, tmp_path):
    """certs-src may be omitted, but when present must be an existing directory."""
    msg = "common.security.certs-src must be an absolute path to an existing directory"

    no_security = with_common(base, security={})
    assert msg not in collect_errors(no_security)

    missing_dir = with_common(base, security={"certs-src": str(tmp_path / "nope")})
    assert msg in collect_errors(missing_dir)


def test_resource_validation(base):
    """cpus must be a number; pids_limit an int; mem/shm need a unit; shm missing."""
    broken = with_common(
        base,
        resources={
            "cpus": "4",  # a string is not a number
            "pids_limit": True,  # bool is rejected even though it subclasses int
            "mem_limit": "4096",  # missing a unit
            # shm_size omitted -> missing
        },
    )
    errors = collect_errors(broken)
    assert "common.resources.cpus must be a positive number of CPU cores" in errors
    assert "common.resources.pids_limit must be an integer" in errors
    assert "common.resources.mem_limit must include a unit, e.g. '4G'" in errors
    assert "common.resources.shm_size is missing" in errors


def test_cpus_must_be_positive_number(base):
    """cpus accepts fractional cores but rejects 0, bools and strings."""
    msg = "common.resources.cpus must be a positive number of CPU cores"
    res = base["common"]["resources"]
    assert msg not in collect_errors(with_common(base, resources={**res, "cpus": 0.5}))
    assert msg in collect_errors(with_common(base, resources={**res, "cpus": 0}))
    assert msg in collect_errors(with_common(base, resources={**res, "cpus": True}))


def test_size_unit_is_required(base):
    """mem_limit/shm_size require a unit; '42s' and bare numbers are rejected."""
    res = base["common"]["resources"]
    bad = with_common(base, resources={**res, "mem_limit": "42s", "shm_size": "256"})
    errors = collect_errors(bad)
    assert "common.resources.mem_limit must include a unit, e.g. '4G'" in errors
    assert "common.resources.shm_size must include a unit, e.g. '512m'" in errors


def test_resources_optional_when_set_limits_false(base):
    """With set_limits=false the cpus/mem/shm/pids fields may all be omitted."""
    data = with_common(base, resources={"set_limits": False})
    assert collect_errors(data) == []


def test_resources_still_validated_when_set_limits_false(base):
    """A bad value is reported even in unlimited mode, when one is supplied."""
    data = with_common(base, resources={"set_limits": False, "cpus": "4"})
    assert "common.resources.cpus must be a positive number of CPU cores" in (
        collect_errors(data)
    )


def test_resources_required_when_set_limits_true(base):
    """set_limits=true keeps every limit field mandatory."""
    data = with_common(base, resources={"set_limits": True})
    errors = collect_errors(data)
    assert "common.resources.cpus is missing" in errors
    assert "common.resources.shm_size is missing" in errors


def test_starting_validation(base):
    """users.starting is optional but must be a list of strings when present."""
    data = copy.deepcopy(base)
    data["users"] = {"starting": ["ok", 5]}
    errors = collect_errors(data)
    assert "users.starting must be a list of strings" in errors

    data["users"] = {}  # absent list is allowed
    assert collect_errors(data) == []


def test_email_validation(base):
    """Each user sub-table must carry a valid email."""
    data = copy.deepcopy(base)
    data["users"] = {
        "starting": ["u1"],
        "u1": {"email": "not-an-email"},
        "u2": {},  # missing email
    }
    errors = collect_errors(data)
    assert "users.u1.email is not a valid email address" in errors
    assert "users.u2.email is not a valid email address" in errors


def test_email_validation_rejects_malformed_addresses(base):
    """email-validator catches cases a minimal regex would wrongly accept."""
    for bad in ("foo@@bar.com", "foo@bar", "foo@.com", 123):
        data = copy.deepcopy(base)
        data["users"] = {"starting": ["u1"], "u1": {"email": bad}}
        assert "users.u1.email is not a valid email address" in collect_errors(data)


def test_groups_and_load_balance_validation(base):
    """Per-user groups must be a string list and load_balance a boolean."""
    data = copy.deepcopy(base)
    data["users"]["u1"] = {
        "email": "u1@intocps.org",
        "groups": "notalist",
        "load_balance": "yes",
    }
    errors = collect_errors(data)
    assert "users.u1.groups must be a list of strings" in errors
    assert "users.u1.load_balance must be true or false" in errors


def test_deploy_sections_are_optional(base):
    """Deployment sections are validated only when present."""
    assert collect_errors(base) == []  # base has no deployment sections


def test_deploy_urls_validated(base):
    """URL fields in deployment sections must be valid URLs."""
    data = copy.deepcopy(base)
    data["frontend"] = {"react-app-oauth-url": "https:s/£@/gitlab.com"}
    data["workspace-localhost"] = {"auth-authority": "http://localhost:5556/dex"}
    errors = collect_errors(data)
    assert "frontend.react-app-oauth-url must be a valid URL" in errors
    # An http localhost authority with a port is a valid URL.
    assert "workspace-localhost.auth-authority must be a valid URL" not in errors


def test_deploy_username_validated(base):
    """default-user fields must be valid usernames."""
    data = copy.deepcopy(base)
    data["localhost"] = {
        "default-user": "bad user",
        "auth-authority": "https://gitlab.com/",
    }
    errors = collect_errors(data)
    assert "localhost.default-user must be a valid username" in errors
    assert "localhost.auth-authority must be a valid URL" not in errors


def test_deploy_placeholder_host_with_underscore_flagged(base):
    """Strict URL checking flags the template's your_server_dns placeholder."""
    data = copy.deepcopy(base)
    data["workspace-secure-server"] = {
        "keycloak-issuer-url": "https://your_server_dns/auth/realms/dtaas"
    }
    assert (
        "workspace-secure-server.keycloak-issuer-url must be a valid URL"
        in collect_errors(data)
    )


def test_non_dict_sections_report_missing_keys():
    """A malformed (non-dict) section is treated as having no keys."""
    errors = collect_errors({"common": "oops", "users": "oops"})
    assert "common.server-dns is missing" in errors
    assert "common.path is missing" in errors


def test_validate_config_missing_file(tmp_path, monkeypatch):
    """validate_config raises FileNotFoundError when no dtaas.toml exists."""
    monkeypatch.chdir(tmp_path)  # neither output_dir nor cwd has the file
    output_dir = str(tmp_path)
    with pytest.raises(FileNotFoundError, match="dtaas.toml not found"):
        validate_config(output_dir)


def test_validate_config_parse_error(tmp_path):
    """validate_config raises ValueError when the file cannot be parsed."""
    (tmp_path / "dtaas.toml").write_text("key = = =")
    output_dir = str(tmp_path)
    with pytest.raises(ValueError):
        validate_config(output_dir)


def test_validate_config_returns_empty_for_valid_file(tmp_path):
    """A real dtaas.toml whose path/certs-src exist validates clean end to end."""
    existing = str(tmp_path).replace("\\", "/")  # forward slashes are TOML-safe
    (tmp_path / "dtaas.toml").write_text(
        'git-repo="https://github.com/into-cps-association/DTaaS.git"\n'
        "[common]\n"
        'server-dns="localhost"\n'
        f'path="{existing}"\n'
        "[common.security]\n"
        f"certs-src='{existing}'\n"
        "[common.resources]\n"
        "cpus=4\npids_limit=4960\n"
        'mem_limit="4G"\nshm_size="512m"\n'
        "[users]\n"
        'add=["u1"]\n'
        "[users.u1]\n"
        'email="u1@intocps.org"\n'
    )
    assert validate_config(str(tmp_path)) == []


def test_validate_config_flags_placeholder_path(tmp_path):
    """The shipped template's placeholder path does not exist, so it is flagged."""
    generate_config(str(tmp_path))
    errors = validate_config(str(tmp_path))
    assert any(e.startswith("common.path") for e in errors)
