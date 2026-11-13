"""rabbitmq: definitions (vhosts, users + password hashes, permissions, queues, exchanges, bindings,
policies) and config. Queued MESSAGES are not included; the module warns with their count."""
from __future__ import annotations

import json

from ..common import BackupError, Context, du_h, write_text

LIST_QUEUES = ('for v in $(rabbitmqctl -q list_vhosts | tail -n +2); do '
               'rabbitmqctl -q list_queues -p "$v" name messages durable | tail -n +2 | '
               'awk -v v="$v" \'{print v "\\t" $0}\'; done')


def estimate(ctx: Context) -> int:
    return len(ctx.docker.raw("exec", ctx.c("rabbitmq"), "rabbitmqctl", "-q", "export_definitions", "-"))


def backup(ctx: Context) -> None:
    d = ctx.dir("rabbitmq")
    c, dk = ctx.c("rabbitmq"), ctx.docker
    defs = d / "definitions.json"
    dk.to_file(["exec", c, "rabbitmqctl", "-q", "export_definitions", "-"], defs)
    try:
        data = json.loads(defs.read_bytes())
    except ValueError as e:
        raise BackupError(f"rabbitmq: definitions.json is not valid JSON: {e}") from e
    for f in ("rabbitmq.conf", "enabled_plugins"):
        write_text(d / f, dk.out("exec", c, "cat", f"/etc/rabbitmq/{f}", check=False))
    write_text(d / "queues.txt", dk.sh(c, LIST_QUEUES))
    msgs = 0
    for line in (d / "queues.txt").read_text().splitlines():
        parts = line.split("\t")
        if len(parts) >= 3 and parts[2].strip().isdigit():
            msgs += int(parts[2])
    ctx.log(f"rabbitmq: definitions {du_h(defs)}, {len(data.get('vhosts', []))} vhosts, "
            f"{len(data.get('users', []))} users, {len(data.get('queues', []))} queues")
    if msgs:
        ctx.warn(f"rabbitmq: {msgs} queued message(s) are NOT in the backup (see rabbitmq/queues.txt)")
