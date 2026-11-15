# thingsboard: TB files + verification data + its OWN dump of the `thingsboard` Postgres DB and the
# roles, so thingsboard/ is self-contained and restorable without a postgres backup. When postgres is
# also selected, that DB is dumped twice (once in postgres/, once here), by design.
# The postgres container must be running (the DB lives there); the TB container may be stopped.
source "$SCRIPT_DIR/services/_pg.sh"

TB_C="${CONTAINER[thingsboard]}"
tb_db() { docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$TB_C" \
            | sed -n 's|^SPRING_DATASOURCE_URL=.*/\([^/?]*\).*|\1|p'; }

estimate_thingsboard() {
  local b=0 dir
  dir="$(mount_src "$TB_C" /data)"
  [[ -n "$dir" ]] && b=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo 0)
  b=$(( ${b:-0} + $(pg_db_size "datname = '$(tb_db)'") ))
  echo "${b:-0}"
}

backup_thingsboard() {
  local d="$OUT/thingsboard" db
  db="$(tb_db)"; [[ -n "$db" ]] || db=thingsboard
  mkdir -p "$d/meta"
  echo "database=${db}" > "$d/meta/tb-info.txt"

  # Exact counts of key TB tables, to compare after restore + upgrade.
  : > "$d/meta/tb-counts.txt"
  local t
  for t in tenant customer tb_user device asset dashboard entity_view rule_chain rule_node \
           device_profile asset_profile widgets_bundle widget_type attribute_kv ts_kv_latest; do
    if [[ "$(psql_c "select to_regclass('public.${t}') is not null" "$db")" == t ]]; then
      echo "${t}|$(psql_c "select count(*) from public.${t}" "$db")" >> "$d/meta/tb-counts.txt"
    fi
  done
  psql_c "select * from tb_schema_settings" "$db" > "$d/meta/tb-schema-version.txt" 2>/dev/null || true
  log "thingsboard: schema $(cat "$d/meta/tb-schema-version.txt"), counts: $(tr '\n' ' ' < "$d/meta/tb-counts.txt")"

  log "thingsboard: dumping roles + database '${db}' (own copy)"
  pg_dump_globals "$d/db"
  pg_dump_db "$db" "$d/db"
  pg_acl_meta "$d/meta"
  echo "database_dump=db/${db}.dump" >> "$d/meta/tb-info.txt"
  selected postgres && log "thingsboard: note: postgres/db/${db}.dump is a second dump, taken a few seconds earlier"

  # TB data dir + TB cert files. Through the TB container when it runs (files are uid 799, mode 600),
  # otherwise through postgres when both mount the same certs dir.
  if running "$TB_C"; then
    docker exec "$TB_C" tar -C / --numeric-owner -czpf - data > "$d/thingsboard-data.tar.gz"
    docker exec "$TB_C" sh -c 'cd /certs && tar --numeric-owner -czpf - thingsboard-*.pem' > "$d/certs.tar.gz" \
      || warn "thingsboard: could not archive TB cert files"
  else
    tar -C "$(dirname "$(mount_src "$TB_C" /data)")" --numeric-owner -czpf "$d/thingsboard-data.tar.gz" \
      "$(basename "$(mount_src "$TB_C" /data)")" 2>/dev/null || warn "thingsboard: could not fully archive the data dir"
    if [[ "$(mount_src "$TB_C" /certs)" == "$(mount_src "$PG_C" /etc/ssl)" ]]; then
      docker exec "$PG_C" sh -c 'cd /etc/ssl && tar --numeric-owner -czpf - thingsboard-*.pem' > "$d/certs.tar.gz" \
        || warn "thingsboard: could not archive TB cert files"
    else
      warn "thingsboard: TB is stopped and its certs dir is not shared with postgres; TB cert files not saved"
    fi
  fi
}
