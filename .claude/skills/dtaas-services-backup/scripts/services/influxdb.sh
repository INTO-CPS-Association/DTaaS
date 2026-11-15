# influxdb: full `influx backup` (all orgs, buckets, users, tokens, dashboards), online.
# The CLI runs in a throwaway container of the same image that shares the server's network
# namespace and /etc/influxdb2 (operator token), writing straight into the backup dir.
IX_C="${CONTAINER[influxdb]}"

estimate_influxdb() {  # on-disk TSM + metadata; `influx backup` gzips, so the result is usually smaller
  docker exec "$IX_C" du -sb /var/lib/influxdb2/engine/data /var/lib/influxdb2/influxd.bolt \
    /var/lib/influxdb2/influxd.sqlite 2>/dev/null | awk '{s+=$1} END{print s+0}'
}

backup_influxdb() {
  local d="$OUT/influxdb" img
  img="$(docker inspect -f '{{.Config.Image}}' "$IX_C")"
  docker exec "$IX_C" influx org list --skip-verify --hide-headers > "$d/orgs.txt"
  docker exec "$IX_C" sh -c 'influx org list --skip-verify --hide-headers | while read id name; do
      influx bucket list --skip-verify --hide-headers --org-id "$id" | awk -v o="$name" "{print o \"\t\" \$0}"; done' > "$d/buckets.txt"
  docker exec "$IX_C" influx user list --skip-verify --hide-headers > "$d/users.txt" || true
  docker exec "$IX_C" cat /etc/influxdb2/influx-configs > "$d/influx-configs"   # operator token
  log "influxdb: $(wc -l < "$d/orgs.txt") orgs, $(wc -l < "$d/buckets.txt") buckets; running 'influx backup' (online)"
  mkdir -p "$d/backup"
  docker run --rm --network "container:${IX_C}" --volumes-from "${IX_C}:ro" \
    -v "$d/backup:/backup" --entrypoint sh "$img" -c \
    "influx backup --skip-verify /backup && chown -R $(id -u):$(id -g) /backup" >> "$LOG" 2>&1 \
    || die "influxdb: influx backup failed (see ${LOG})"
  log "influxdb: $(du -sh "$d/backup" | cut -f1), $(find "$d/backup" -type f | wc -l) files"
}
