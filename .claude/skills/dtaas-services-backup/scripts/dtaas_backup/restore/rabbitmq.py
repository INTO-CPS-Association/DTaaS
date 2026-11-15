"""Restore rabbitmq: import the definitions (vhosts, users with password hashes, permissions, queues,
exchanges, bindings, policies). Queued messages were never in the backup."""
from __future__ import annotations

import json

from .core import RestoreContext, RestoreError

SVC = "rabbitmq"


def ctl(ctx: RestoreContext, *args: str, check: bool = True) -> str:
    return ctx.docker.out("exec", ctx.container(SVC), "rabbitmqctl", "-q", *args, check=check)


def names(text: str) -> set[str]:
    """First column of rabbitmqctl -q output, header line removed."""
    lines = [l.split("\t")[0].strip() for l in text.splitlines() if l.strip()]
    return set(lines[1:]) if lines and lines[0] in ("name", "user") else set(lines)


def check(ctx: RestoreContext) -> list[str]:
    return [] if (ctx.backup / SVC / "definitions.json").is_file() else ["rabbitmq/definitions.json missing in the backup"]


def restore(ctx: RestoreContext) -> None:
    ctx.cli("start", SVC)
    ctx.wait("rabbitmq", lambda: ctx.run_docker("exec", ctx.container(SVC), "rabbitmq-diagnostics", "-q",
                                                 "check_running").returncode == 0, timeout=180)
    ctx.confirm("Import the RabbitMQ definitions (vhosts, users, permissions, queues) from the backup?")
    ctx.copy_in(SVC, ctx.backup / SVC / "definitions.json", "/tmp/definitions.json")
    if ctx.opts.dry_run:
        return
    p = ctx.run_docker("exec", ctx.container(SVC), "rabbitmqctl", "import_definitions", "/tmp/definitions.json")
    ctx._append_log(p.stdout + p.stderr)
    if p.returncode != 0:
        raise RestoreError(f"rabbitmqctl import_definitions failed (see {ctx.log_path})")
    ctx.log("rabbitmq: definitions imported")
    # Config differences are reported, never overwritten.
    for name, target in (("rabbitmq.conf", "config/rabbitmq/rabbitmq.conf"),
                         ("enabled_plugins", "config/rabbitmq/rabbitmq.enabled_plugins")):
        src, dst = ctx.backup / SVC / name, ctx.project / target
        if src.is_file() and dst.is_file() and src.read_text().strip() != dst.read_text().strip():
            ctx.note(f"rabbitmq: {target} differs from the source's {name}; compare them (not changed)")


def verify(ctx: RestoreContext) -> list[str]:
    if ctx.opts.dry_run:
        return []
    d = json.loads((ctx.backup / SVC / "definitions.json").read_bytes())
    problems = []
    vh = names(ctl(ctx, "list_vhosts", "name"))
    problems += [f"vhost missing: {v['name']}" for v in d.get("vhosts", []) if v["name"] not in vh]
    us = names(ctl(ctx, "list_users"))
    problems += [f"user missing: {u['name']}" for u in d.get("users", []) if u["name"] not in us]
    for q in d.get("queues", []):
        qs = names(ctl(ctx, "list_queues", "-p", q["vhost"], "name", check=False))
        if q["name"] not in qs:
            problems.append(f"queue missing: {q['vhost']}/{q['name']}")
    ctx.log(f"rabbitmq: verified {len(d.get('vhosts', []))} vhosts, {len(d.get('users', []))} users, "
            f"{len(d.get('queues', []))} queues" + (f"; {len(problems)} problem(s)" if problems else ": OK"))
    return problems
