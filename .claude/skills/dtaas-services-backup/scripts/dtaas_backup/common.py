"""Shared helpers: docker calls, logging, sizes, permissions, checksums.

Cross-platform rules (Linux, macOS, Windows):
- No host shell: every command is an argv list, so no quoting, word-splitting or MSYS path rewriting.
- Binary data never passes through Python memory or text mode: tool output goes straight to a file
  opened in binary mode (subprocess stdout=<file>), and stdin comes from a binary file.
- No timeouts: dumps of hundreds of GB take hours.
"""
from __future__ import annotations

import datetime
import hashlib
import json
import os
import re
import shutil
import socket
import subprocess
import sys
from pathlib import Path

IS_WINDOWS = os.name == "nt"


class BackupError(Exception):
    """A step failed; the backup is left marked INCOMPLETE."""


# ---------------------------------------------------------------- formatting
def human(n: int | float) -> str:
    """SI units with 2 decimals, like `numfmt --to=si --suffix=B --format=%.2f`."""
    n = float(n or 0)
    for unit in ("", "K", "M", "G", "T", "P"):
        if abs(n) < 1000 or unit == "P":
            return f"{n:.2f}{unit}B"
        n /= 1000
    return f"{n:.2f}PB"


def du_h(path: Path) -> str:
    """Short binary-unit size of a file or tree, like `du -h` (used in log lines)."""
    size = tree_size(path)
    for unit in ("", "K", "M", "G", "T"):
        if size < 1024 or unit == "T":
            return f"{size:.0f}{unit}" if unit == "" or size >= 10 else f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}T"


def tree_size(path: Path) -> int:
    """Total bytes of a file or directory tree; unreadable entries count as 0."""
    path = Path(path)
    if path.is_file():
        return path.stat().st_size
    total = 0
    for root, _dirs, files in os.walk(path, onerror=lambda e: None):
        for f in files:
            try:
                total += (Path(root) / f).stat().st_size
            except OSError:
                pass
    return total


def same_host(a: str, b: str) -> bool:
    """Hostnames match ignoring case and domain (Windows reports upper case)."""
    norm = lambda h: h.strip().lower().split(".")[0]
    return norm(a) == norm(b)


def local_hostname() -> str:
    return socket.gethostname()


def host_path(p: str) -> Path:
    """Path reported by docker (mount source, compose working dir) as a path on this computer.

    Docker Desktop on Windows may report bind sources as /run/desktop/mnt/host/c/... ."""
    if IS_WINDOWS:
        m = re.match(r"^/run/desktop/mnt/host/([a-zA-Z])/(.*)$", p or "")
        if m:
            return Path(f"{m.group(1).upper()}:/{m.group(2)}")
    return Path(p)


# ---------------------------------------------------------------- docker
class Docker:
    def __init__(self) -> None:
        self._inspect: dict[str, dict | None] = {}
        if shutil.which("docker") is None:
            raise BackupError("the docker CLI is not on PATH")

    @staticmethod
    def _fail(args: list[str], rc: int, err: bytes | str) -> BackupError:
        if isinstance(err, bytes):
            err = err.decode("utf-8", "replace")
        shown = " ".join(args[:4]) + (" ..." if len(args) > 4 else "")
        return BackupError(f"`docker {shown}` failed (exit {rc}): {err.strip()[-800:]}")

    def out(self, *args: str, check: bool = True) -> str:
        """Run docker, return stdout as text (small outputs only)."""
        p = subprocess.run(["docker", *args], capture_output=True)
        if check and p.returncode != 0:
            raise self._fail(list(args), p.returncode, p.stderr)
        return p.stdout.decode("utf-8", "replace")

    def raw(self, *args: str) -> bytes:
        p = subprocess.run(["docker", *args], capture_output=True)
        if p.returncode != 0:
            raise self._fail(list(args), p.returncode, p.stderr)
        return p.stdout

    def to_file(self, args: list[str], path: Path, stdin_path: Path | None = None,
                append_log: Path | None = None) -> None:
        """Run docker with stdout streamed into `path` (binary), optional binary stdin."""
        stdin = open(stdin_path, "rb") if stdin_path else subprocess.DEVNULL
        try:
            with open(path, "wb") as f:
                p = subprocess.run(["docker", *args], stdin=stdin, stdout=f, stderr=subprocess.PIPE)
        finally:
            if stdin_path:
                stdin.close()
        if append_log and p.stderr:
            with open(append_log, "ab") as lf:
                lf.write(p.stderr)
        if p.returncode != 0:
            raise self._fail(args, p.returncode, p.stderr)

    def to_log(self, args: list[str], log_path: Path) -> None:
        """Run docker with stdout+stderr appended to the backup log."""
        with open(log_path, "ab") as lf:
            p = subprocess.run(["docker", *args], stdin=subprocess.DEVNULL, stdout=lf, stderr=subprocess.STDOUT)
        if p.returncode != 0:
            raise self._fail(args, p.returncode, f"see {log_path}")

    def sh(self, container: str, script: str, *argv: str, check: bool = True) -> str:
        """`sh -c script` inside a container; argv become $1, $2, ... (no quoting needed)."""
        return self.out("exec", container, "sh", "-c", script, "sh", *argv, check=check)

    # inspection ------------------------------------------------------
    def inspect(self, c: str, refresh: bool = False) -> dict | None:
        if refresh or c not in self._inspect:
            p = subprocess.run(["docker", "inspect", c], capture_output=True)
            self._inspect[c] = json.loads(p.stdout)[0] if p.returncode == 0 else None
        return self._inspect[c]

    def running(self, c: str) -> bool:
        i = self.inspect(c, refresh=True)
        return bool(i and i["State"].get("Running"))

    def image(self, c: str) -> str:
        return (self.inspect(c) or {}).get("Config", {}).get("Image", "")

    def env(self, c: str) -> dict[str, str]:
        out = {}
        for kv in (self.inspect(c) or {}).get("Config", {}).get("Env") or []:
            k, _, v = kv.partition("=")
            out[k] = v
        return out

    def label(self, c: str, key: str) -> str:
        return ((self.inspect(c) or {}).get("Config", {}).get("Labels") or {}).get(key, "")

    def mounts(self, c: str) -> list[dict]:
        return (self.inspect(c) or {}).get("Mounts") or []

    def mount_src(self, c: str, dest: str) -> str:
        for m in self.mounts(c):
            if m.get("Destination") == dest:
                return m.get("Source", "")
        return ""


# ---------------------------------------------------------------- permissions
def secure_dir(path: Path) -> str | None:
    """Make a backup dir readable by the current user only. Returns a warning text on failure."""
    if IS_WINDOWS:
        user = os.environ.get("USERNAME", "")
        if not user:
            return f"could not restrict access to {path}: USERNAME is not set"
        p = subprocess.run(["icacls", str(path), "/inheritance:r", "/grant:r", f"{user}:(OI)(CI)F"],
                           capture_output=True)
        if p.returncode != 0:
            return f"could not restrict access to {path} with icacls: {p.stderr.decode(errors='replace').strip()}"
        return None
    os.chmod(path, 0o700)
    return None


def finalize_permissions(path: Path) -> None:
    """POSIX: dirs 700, files 600 (like `chmod -R go-rwx` under umask 077). Windows: inherited ACL."""
    if IS_WINDOWS:
        return
    for root, dirs, files in os.walk(path):
        os.chmod(root, 0o700)
        for f in files:
            fp = Path(root) / f
            os.chmod(fp, (fp.stat().st_mode & 0o700) | 0o600)


def copy_by_hand_hint(src: Path, dst: Path) -> str:
    """Exact command for the user to copy a file the script cannot read (needs elevated rights)."""
    if IS_WINDOWS:
        return f'in an Administrator PowerShell: Copy-Item -LiteralPath "{src}" -Destination "{dst}"'
    uid = os.getuid() if hasattr(os, "getuid") else 0
    return f"in your own terminal: sudo install -m 600 -o {uid} {src} {dst}"


# ---------------------------------------------------------------- checksums
SUMS = "SHA256SUMS"
INCOMPLETE = "INCOMPLETE"
EXCLUDE_FROM_SUMS = {SUMS, "backup.log", INCOMPLETE}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def backup_files(root: Path) -> list[str]:
    """Relative POSIX paths ('./a/b') of all files, excluding the log/sums/marker at the root."""
    rels = []
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            rel = (Path(dirpath) / f).relative_to(root).as_posix()
            if rel in EXCLUDE_FROM_SUMS:
                continue
            rels.append("./" + rel)
    return sorted(rels)


def write_sums(root: Path) -> None:
    """SHA256SUMS in `sha256sum` format, so `sha256sum -c` also works on Linux."""
    lines = [f"{sha256(root / rel[2:])}  {rel}\n" for rel in backup_files(root)]
    with open(root / SUMS, "w", encoding="utf-8", newline="\n") as f:
        f.writelines(lines)


def verify_sums(root: Path) -> tuple[list[str], list[str], list[str]]:
    """Returns (bad_or_missing, ok, not_listed)."""
    listed: dict[str, str] = {}
    with open(root / SUMS, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            digest, rel = line.split("  ", 1)
            rel = rel.lstrip("*")                       # sha256sum binary-mode marker
            listed[rel if rel.startswith("./") else "./" + rel] = digest   # older backups list 'db/x' instead of './db/x'
    bad, ok = [], []
    for rel, digest in listed.items():
        p = root / rel[2:] if rel.startswith("./") else root / rel
        if not p.is_file():
            bad.append(f"MISSING  {rel}")
        elif sha256(p) != digest:
            bad.append(f"CHANGED  {rel}")
        else:
            ok.append(rel)
    not_listed = [rel for rel in backup_files(root) if rel not in listed]
    return bad, ok, not_listed


# ---------------------------------------------------------------- run context
class Context:
    """State of one backup run, shared by the service modules."""

    def __init__(self, out: Path, selected: list[str], containers: dict[str, str], opts) -> None:
        self.out = out
        self.selected = selected
        self.containers = containers
        self.opts = opts
        self.docker = Docker()
        self.log_path: Path | None = None
        self.warnings: list[str] = []
        self.saved_projects: set[str] = set()

    def c(self, service: str) -> str:
        return self.containers[service]

    def is_selected(self, service: str) -> bool:
        return service in self.selected

    def dir(self, service: str) -> Path:
        d = self.out / service
        d.mkdir(parents=True, exist_ok=True)
        return d

    def log(self, msg: str) -> None:
        line = f"[{datetime.datetime.now():%H:%M:%S}] {msg}"
        print(line, flush=True)
        if self.log_path:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(line + "\n")

    def warn(self, msg: str) -> None:
        self.log(f"WARNING: {msg}")
        self.warnings.append(msg)


def write_text(path: Path, text: str) -> None:
    """Text files are written with LF endings on every OS (identical backups everywhere)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def python_hint() -> str:
    return sys.executable or "python"
