"""Tests for host.py."""

from pathlib import Path

import host
from settings import Settings


def test_has_hosts_entry_matches_hostname_field():
    """Only an uncommented hostname field counts as an entry."""
    text = "127.0.0.1 localhost\n127.0.0.1 intocps.test  # local\n"
    assert host.has_hosts_entry(text, "intocps.test")
    assert not host.has_hosts_entry(text, "intocps")
    assert not host.has_hosts_entry("# 127.0.0.1 intocps.test\n", "intocps.test")


def test_add_hosts_entry_appends_once(tmp_path, monkeypatch):
    """The hosts line is appended once, through sudo."""
    hosts_file = tmp_path / "hosts"
    hosts_file.write_text("127.0.0.1 localhost\n", encoding="utf-8")
    calls = []
    monkeypatch.setattr(host, "HOSTS_FILE", hosts_file)
    monkeypatch.setattr(host, "sudo", lambda args, input_text=None:
                        calls.append((args, input_text)))
    host.add_hosts_entry("intocps.test")
    assert calls == [(["tee", "-a", str(hosts_file)], "127.0.0.1 intocps.test\n")]
    hosts_file.write_text("127.0.0.1 intocps.test\n", encoding="utf-8")
    host.add_hosts_entry("intocps.test")
    assert len(calls) == 1


def test_remove_hosts_entry_keeps_other_lines(tmp_path, monkeypatch):
    """Removing the entry keeps every other hosts line."""
    hosts_file = tmp_path / "hosts"
    hosts_file.write_text("127.0.0.1 localhost\n127.0.0.1 intocps.test\n", encoding="utf-8")
    calls = []
    monkeypatch.setattr(host, "HOSTS_FILE", hosts_file)
    monkeypatch.setattr(host, "sudo", lambda args, input_text=None:
                        calls.append(input_text))
    host.remove_hosts_entry("intocps.test")
    assert calls == ["127.0.0.1 localhost\n"]


def test_detect_runtime_from_context_and_daemon(monkeypatch):
    """The context name and the daemon's system name tell the runtimes apart."""
    cases = (("rancher-desktop", "Alpine Linux", "rancher"),
             ("desktop-linux", "Docker Desktop", "desktop"),
             ("default", "Docker Desktop", "desktop"),
             ("default", "Ubuntu 26.04 LTS", "engine"))
    for context, system, runtime in cases:
        def fake_run(args, c=context, s=system, **_):
            """Answer docker context show and docker info."""
            return c if args[1] == "context" else s
        monkeypatch.setattr(host, "run", fake_run)
        assert host.detect_runtime() == runtime


def test_registry_ca_dir_depends_on_runtime():
    """Docker Engine reads /etc; the desktop runtimes read ~/.docker."""
    assert host.registry_ca_dir("engine", "h:5050") == Path(
        "/etc/docker/certs.d/h:5050")
    assert host.registry_ca_dir("rancher", "h:5050") == (
        Path.home() / ".docker" / "certs.d" / "h:5050")


def test_trust_registry_ca_copies_for_rancher(tmp_path, monkeypatch):
    """Rancher Desktop gets the CA without sudo."""
    ca_file = tmp_path / "rootCA.pem"
    ca_file.write_text("CA", encoding="utf-8")
    monkeypatch.setattr(host, "registry_ca_dir", lambda runtime, registry:
                        tmp_path / "certs.d" / registry)
    host.trust_registry_ca("rancher", "h:5050", ca_file)
    assert (tmp_path / "certs.d" / "h:5050" / "ca.crt").read_text(encoding="utf-8") == "CA"


def test_trust_registry_ca_uses_sudo_for_engine(tmp_path, monkeypatch):
    """Docker Engine gets the CA through sudo."""
    calls = []
    monkeypatch.setattr(host, "sudo", lambda args, input_text=None:
                        calls.append(args[0]))
    host.trust_registry_ca("engine", "h:5050", tmp_path / "rootCA.pem")
    assert calls == ["mkdir", "cp"]


def test_allow_low_ports_only_for_rancher(tmp_path, monkeypatch):
    """The port limit changes only for Rancher Desktop, and only once."""
    limit = tmp_path / "limit"
    limit.write_text("1024\n", encoding="utf-8")
    calls = []
    monkeypatch.setattr(host, "PORT_LIMIT_FILE", limit)
    monkeypatch.setattr(host, "sudo", lambda args, input_text=None:
                        calls.append(args[0]))
    host.allow_low_ports("engine")
    assert not calls
    host.allow_low_ports("rancher")
    assert calls == ["sysctl", "tee"]
    limit.write_text("80\n", encoding="utf-8")
    host.allow_low_ports("rancher")
    assert calls == ["sysctl", "tee"]


def test_install_mkcert_updates_apt_first(monkeypatch):
    """A missing mkcert is installed after apt-get update."""
    calls = []
    monkeypatch.setattr(host.shutil, "which",
                        lambda name: None if name == "mkcert" else "/usr/bin/apt-get")
    monkeypatch.setattr(host, "sudo", lambda args, input_text=None:
                        calls.append(args[:2]))
    host.install_mkcert()
    assert calls == [["apt-get", "update"], ["apt-get", "install"]]


def test_prepare_host_runs_steps_in_order(tmp_path, monkeypatch):
    """The host step maps the hostname before trusting the CAs."""
    calls = []
    monkeypatch.setattr(host, "detect_runtime", lambda: "rancher")
    for name in ("add_hosts_entry", "allow_low_ports", "install_mkcert",
                 "install_local_ca", "trust_registry_ca"):
        monkeypatch.setattr(host, name, lambda *args, n=name: calls.append(n))
    host.prepare_host(Settings("intocps.test", 5050, tmp_path))
    assert calls == ["add_hosts_entry", "allow_low_ports", "install_mkcert",
                     "install_local_ca", "trust_registry_ca"]
