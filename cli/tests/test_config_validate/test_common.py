"""Tests for the globals and [common] checks of config_validate."""

import copy
from src.pkg.config_validate import collect_errors


def with_common(base, **changes):
    """Return a deep copy of *base* with common-section keys overridden."""
    data = copy.deepcopy(base)
    data["common"].update(changes)
    return data


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
