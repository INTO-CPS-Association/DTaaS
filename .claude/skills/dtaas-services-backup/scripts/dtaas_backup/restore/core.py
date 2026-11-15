"""Restore context: target project, safety checks, service lifecycle, helpers shared by the restorers."""
from __future__ import annotations

import datetime
import os
import re
import shutil
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from ..common import IS_WINDOWS, BackupError, Docker, write_text
from .env import COMPOSE_SERVICE, CLI_SERVICE, ComposeService, parse_compose, read_env

COMPOSE_FILES = ["compose.services.yml", "compose.thingsboard.yml", "compose.gitlab.yml"]


class RestoreError(BackupError):
    """A restore step failed; the run is left marked INCOMPLETE."""


class Aborted(RestoreError):
    """The user declined a confirmation."""


class RestoreContext:
    def __init__(self, backup: Path, project: Path, selected: list[str], opts) -> None:
        self.backup = backup
        self.project = project
        self.selected = selected
        self.opts = opts
        self.docker = Docker()
        self.warnings: list[str] = []
        self.notes: list[str] = []          # lines for the final report
        self.started: set[str] = set()      # services started by this run
        self.run_dir: Path | None = None
        self.log_path: Path | None = None
        self.compose: dict[str, ComposeService] = {}
        for f in COMPOSE_FILES:
            if (project / f).is_file():
                self.compose.update(parse_compose(project / f))
        self.env_path = project / "config" / "services.env"

    # ------------------------------------------------------------ output
    def log(self, msg: str) -> None:
        line = f"[{datetime.datetime.now():%H:%M:%S}] {msg}"
        print(line, flush=True)
        if self.log_path:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(line + "\n")

    def warn(self, msg: str) -> None:
        self.log(f"WARNING: {msg}")
        self.warnings.append(msg)

    def confirm(self, question: str) -> None:
        """Destructive steps need --yes, or an interactive 'y'."""
        if self.opts.dry_run:
            self.log(f"[dry-run] would ask: {question}")
            return
        if self.opts.yes:
            self.log(f"confirmed by --yes: {question}")
            return
        if not sys.stdin.isatty():
            raise Aborted(f"needs confirmation: {question}  (rerun with --yes after confirming)")
        ans = input(f"{question} [y/N] ").strip().lower()
        if ans not in ("y", "yes"):
            raise Aborted(f"declined: {question}")
        self.log(f"confirmed: {question}")

    # ------------------------------------------------------------ target project
    @property
    def env(self) -> dict[str, str]:
        return read_env(self.env_path)

    def compose_project_name(self) -> str:
        """dtaas-services names the compose project after HOSTNAME (lowercase, '.'/'_' -> '-')."""
        host = self.env.get("HOSTNAME", "")
        if not host:
            raise RestoreError(f"HOSTNAME is not set in {self.env_path}")
        return host.lower().replace(".", "-").replace("_", "-")

    def svc(self, service: str) -> ComposeService:
        name = COMPOSE_SERVICE[service]
        if name not in self.compose:
            raise RestoreError(f"service {name} not found in the compose files of {self.project}")
        return self.compose[name]

    def container(self, service: str) -> str:
        return self.svc(service).container or COMPOSE_SERVICE[service]

    def image(self, service: str) -> str:
        return self.svc(service).image

    def data_dirs(self, service: str) -> list[Path]:
        """Host dirs under the project that hold the service's data (bind mounts under ./data/)."""
        return [self.project / host for host, _ in self.svc(service).binds if host.startswith("data/")]

    # ------------------------------------------------------------ safety checks
    def unsafe_location(self, path: Path) -> str | None:
        """'refuse' reason for Windows drives, 'warn:' reason for macOS folders, None if a Linux filesystem."""
        p = str(path.resolve())
        if IS_WINDOWS and re.match(r"^[A-Za-z]:", p):
            return ("on a Windows drive: databases there can lose data and PostgreSQL rejects its key. "
                    "Create the dtaas-services project inside WSL2 (see CROSS-PLATFORM.md)")
        if re.match(r"^/mnt/[a-zA-Z]/", p) or p.startswith("/run/desktop/mnt/host/"):
            return ("on a Windows drive mounted into WSL/Docker Desktop. "
                    "Create the dtaas-services project inside the WSL2 filesystem (see CROSS-PLATFORM.md)")
        if sys.platform == "darwin" and (p.startswith("/Users/") or p.startswith("/Volumes/")):
            return "warn: a macOS folder shared into Docker Desktop: fine for tests, slower and less crash-safe for real data"
        return None

    def is_empty(self, d: Path) -> bool:
        if not d.exists():
            return True
        try:
            return not any(x.name != ".gitkeep" for x in d.iterdir())
        except PermissionError:
            return False   # unreadable = owned by a service = not empty

    def container_conflict(self, service: str) -> str | None:
        """A container with the target's name that belongs to a different compose project/dir (e.g. the live
        services on this host) must never be touched."""
        c = self.container(service)
        i = self.docker.inspect(c, refresh=True)
        if not i:
            return None
        labels = i.get("Config", {}).get("Labels") or {}
        wd = labels.get("com.docker.compose.project.working_dir", "")
        proj = labels.get("com.docker.compose.project", "")
        if wd and Path(wd).resolve() == self.project.resolve() and proj == self.compose_project_name():
            return None
        return (f"a container named '{c}' already exists and belongs to "
                f"{'compose project ' + proj + ' in ' + wd if wd else 'something else (no compose labels)'}; "
                f"this restore would collide with it")

    # ------------------------------------------------------------ lifecycle
    def cli_path(self) -> str:
        if getattr(self.opts, "dtaas_cli", None):
            return self.opts.dtaas_cli
        for cand in (self.project / ".venv" / "bin" / "dtaas-services",
                     self.project / ".venv" / "Scripts" / "dtaas-services.exe",
                     Path(sys.executable).parent / ("dtaas-services.exe" if IS_WINDOWS else "dtaas-services")):
            if cand.is_file():
                return str(cand)
        found = shutil.which("dtaas-services")
        if found:
            return found
        raise RestoreError("the dtaas-services command was not found; pass --dtaas-cli <path>")

    def cli(self, action: str, service: str) -> None:
        """`dtaas-services service <action> -s <svc>`, run in the project dir (same compose project + env as the CLI)."""
        args = [self.cli_path(), "service", action, "-s", CLI_SERVICE[service]]
        if action == "start":
            if service in self.started:
                return
            self.started.add(service)
        elif action == "stop":
            self.started.discard(service)
        if self.opts.dry_run:
            self.log(f"[dry-run] would run: dtaas-services service {action} -s {CLI_SERVICE[service]}")
            return
        self.log(f"dtaas-services service {action} -s {CLI_SERVICE[service]}")
        p = subprocess.run(args, cwd=self.project, capture_output=True, stdin=subprocess.DEVNULL)
        self._append_log(p.stdout + p.stderr)
        if p.returncode != 0:
            raise RestoreError(f"dtaas-services service {action} -s {service} failed (see {self.log_path})")

    def compose_cmd(self, *args: str, log_output: bool = True) -> subprocess.CompletedProcess:
        """docker compose with the CLI's project name, all compose files and config/services.env."""
        cmd = ["docker", "compose", "-p", self.compose_project_name()]
        for f in COMPOSE_FILES:
            if (self.project / f).is_file():
                cmd += ["-f", f]
        cmd += ["--env-file", "config/services.env", *args]
        p = subprocess.run(cmd, cwd=self.project, capture_output=True, stdin=subprocess.DEVNULL)
        if log_output:
            self._append_log(p.stdout + p.stderr)
        return p

    def run_docker(self, *args: str, env: dict | None = None) -> subprocess.CompletedProcess:
        """docker with stdout/stderr captured separately (bytes); env adds `-e NAME` passthrough values."""
        return subprocess.run(["docker", *args], capture_output=True, stdin=subprocess.DEVNULL,
                              env={**os.environ, **(env or {})})

    def _append_log(self, data: bytes) -> None:
        if self.log_path and data:
            with open(self.log_path, "ab") as f:
                f.write(data)

    def wait(self, what: str, check, timeout: int = 300, interval: int = 5) -> None:
        if self.opts.dry_run:
            self.log(f"[dry-run] would wait for {what}")
            return
        self.log(f"waiting for {what} (up to {timeout}s)")
        end = time.time() + timeout
        while time.time() < end:
            try:
                if check():
                    self.log(f"{what}: ready")
                    return
            except Exception:
                pass
            time.sleep(interval)
        raise RestoreError(f"timed out waiting for {what}")

    # ------------------------------------------------------------ helpers
    def copy_in(self, service: str, src: Path, dest: str) -> None:
        """docker cp a backup file into a container (no stdin piping: works from every shell/OS)."""
        if self.opts.dry_run:
            self.log(f"[dry-run] would copy {src.name} into {self.container(service)}:{dest}")
            return
        self.docker.out("cp", str(src), f"{self.container(service)}:{dest}")

    def as_root(self, image: str, mounts: list[tuple[Path, str, str]], script: str, *argv: str) -> None:
        """Run a shell script as root in a throwaway container of `image` (owners/permissions without sudo).
        mounts: (host path, container path, 'ro'|'rw')."""
        if self.opts.dry_run:
            self.log(f"[dry-run] would run as root in {image}: {script.splitlines()[0][:100]}")
            return
        args = ["run", "--rm", "--user", "0", "--entrypoint", "sh"]
        for host, ctr, mode in mounts:
            args += ["-v", f"{Path(host).resolve()}:{ctr}:{mode}"]
        self.docker.to_log([*args, image, "-c", script, "sh", *argv], self.log_path)

    def https_ok(self, port: str, path: str = "/") -> bool:
        """True if https://localhost:<port><path> answers (any HTTP status), certificate not verified."""
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        try:
            with urllib.request.urlopen(f"https://localhost:{port}{path}", context=ctx, timeout=10):
                return True
        except urllib.error.HTTPError:
            return True
        except Exception:
            return False

    def checkpoint_dir(self, name: str) -> Path:
        d = self.run_dir / "checkpoints" / name
        d.mkdir(parents=True, exist_ok=True)
        return d

    def note(self, msg: str) -> None:
        self.notes.append(msg)
        self.log(msg)


def compare_lines(expected: Path, actual: str) -> tuple[list[str], list[str]]:
    """(missing, extra) lines of `actual` vs the file `expected` (order ignored, blanks ignored)."""
    exp = {l.strip() for l in expected.read_text(encoding="utf-8").splitlines() if l.strip()} if expected.is_file() else set()
    act = {l.strip() for l in actual.splitlines() if l.strip()}
    return sorted(exp - act), sorted(act - exp)


def write_report(path: Path, lines: list[str]) -> None:
    write_text(path, "\n".join(lines) + "\n")


def osenv(**kv: str) -> dict[str, str]:
    """Process env with extra secrets for `docker ... -e NAME` passthrough (values never on the command line)."""
    return {**os.environ, **kv}
