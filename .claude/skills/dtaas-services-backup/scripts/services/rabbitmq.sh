# rabbitmq: definitions (vhosts, users + password hashes, permissions, queues, exchanges, bindings,
# policies) and config. Queued MESSAGES are not included; the module warns with their count.
RB_C="${CONTAINER[rabbitmq]}"

estimate_rabbitmq() { docker exec "$RB_C" rabbitmqctl -q export_definitions - 2>/dev/null | wc -c; }

backup_rabbitmq() {
  local d="$OUT/rabbitmq" f msgs
  docker exec "$RB_C" rabbitmqctl -q export_definitions - > "$d/definitions.json" 2>/dev/null \
    || die "rabbitmq: export_definitions failed"
  python3 -I -c 'import json,sys; json.load(open(sys.argv[1]))' "$d/definitions.json" \
    || die "rabbitmq: definitions.json is not valid JSON"
  for f in /etc/rabbitmq/rabbitmq.conf /etc/rabbitmq/enabled_plugins; do
    docker exec "$RB_C" cat "$f" > "$d/$(basename "$f")" 2>/dev/null || true
  done
  docker exec "$RB_C" sh -c 'for v in $(rabbitmqctl -q list_vhosts | tail -n +2); do
      rabbitmqctl -q list_queues -p "$v" name messages durable | tail -n +2 | awk -v v="$v" "{print v \"\t\" \$0}"; done' > "$d/queues.txt"
  msgs="$(awk -F'\t' '{m+=$3} END{print m+0}' "$d/queues.txt")"
  log "rabbitmq: definitions $(du -h "$d/definitions.json" | cut -f1), $(python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1])); print(len(d.get("vhosts",[])),"vhosts,",len(d.get("users",[])),"users,",len(d.get("queues",[])),"queues")' "$d/definitions.json")"
  (( msgs == 0 )) || warn "rabbitmq: ${msgs} queued message(s) are NOT in the backup (see rabbitmq/queues.txt)"
}
