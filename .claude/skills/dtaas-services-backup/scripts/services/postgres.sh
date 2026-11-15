# postgres: roles + every non-template database (thingsboard, swim, ...), as logical dumps.
source "$SCRIPT_DIR/services/_pg.sh"

estimate_postgres() { pg_db_size "not datistemplate and datname <> 'postgres'"; }

backup_postgres() {
  local d="$OUT/postgres" dbs db
  mkdir -p "$d/meta" "$d/db"
  {
    echo "server_version=$(psql_c 'show server_version')"
    echo "pg_dump_version=$(docker exec "$PG_C" pg_dump --version)"
    echo "pg_user=$(pg_user)"
  } > "$d/meta/versions.txt"
  psql_c "select datname, pg_encoding_to_char(encoding), datcollate, datctype, pg_size_pretty(pg_database_size(datname))
          from pg_database order by 1" > "$d/meta/databases.txt"
  psql_c "select name, setting from pg_settings where source not in ('default','override') order by 1" > "$d/meta/settings.txt"
  docker exec "$PG_C" sh -c 'cat "$PGDATA/pg_hba.conf"' > "$d/meta/pg_hba.conf" 2>/dev/null || true
  pg_acl_meta "$d/meta"

  dbs="$(psql_c "select datname from pg_database where not datistemplate and datname <> 'postgres' order by 1")"
  log "postgres: databases: $(echo $dbs)"
  for db in $dbs; do
    psql_c "select extname, extversion from pg_extension order by 1" "$db" > "$d/meta/extensions.$db.txt"
    psql_c "select schemaname||'.'||relname, n_live_tup from pg_stat_user_tables order by 1" "$db" > "$d/meta/table-estimates.$db.txt"
  done

  log "postgres: dumping globals (roles, tablespaces)"
  pg_dump_globals "$d/db"
  for db in $dbs; do pg_dump_db "$db" "$d/db"; done

  # Only the cert files postgres uses (certs/ is mounted at /etc/ssl; key is root/postgres-only on the host).
  docker exec "$PG_C" tar -C /etc/ssl --numeric-owner -czpf - postgres.crt postgres.key > "$d/certs.tar.gz" 2>/dev/null \
    || warn "postgres: could not archive postgres.crt/key"
}
