# Shared PostgreSQL helpers for the postgres and thingsboard modules (sourced; not a service).
[[ -n "${_PG_HELPERS:-}" ]] && return 0
_PG_HELPERS=1

PG_C="${CONTAINER[postgres]}"
pg_user() {
  docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$PG_C" | sed -n 's/^POSTGRES_USER=//p'
}
# psql over the container's local socket (no password needed in the official image).
psql_c() { docker exec "$PG_C" psql -U "$(pg_user)" -d "${2:-postgres}" -XAtqc "$1"; }

pg_db_size() { psql_c "select coalesce(sum(pg_database_size(datname)),0) from pg_database where $1"; }

# Roles (with password hashes) and tablespaces.
pg_dump_globals() {
  mkdir -p "$1"
  docker exec "$PG_C" pg_dumpall -U "$(pg_user)" --globals-only > "$1/globals.sql"
}

# One database as a --create custom-format archive (keeps owner, ACL, ALTER DATABASE settings),
# validated by listing its TOC. `pg_restore -l` hides the DATABASE/ACL entries without --create.
pg_dump_db() {
  local db=$1 dir=$2
  mkdir -p "$dir"
  docker exec "$PG_C" pg_dump -U "$(pg_user)" -d "$db" -Fc -Z 6 --create > "$dir/$db.dump"
  docker exec -i "$PG_C" pg_restore --list --create < "$dir/$db.dump" > "$dir/$db.toc" \
    || die "postgres: dump of ${db} failed validation"
  grep -qE " DATABASE - ${db} " "$dir/$db.toc" || die "postgres: dump of ${db} has no DATABASE entry"
  log "  ${db}.dump: $(du -h "$dir/$db.dump" | cut -f1), $(grep -c 'TABLE DATA' "$dir/$db.toc") table-data entries"
}

# Database-level owner/ACL, per-db/role settings, role memberships: for verification after restore.
pg_acl_meta() {
  local m=$1
  mkdir -p "$m"
  psql_c "select datname, pg_get_userbyid(datdba), coalesce(datacl::text,'<default>')
          from pg_database where not datistemplate order by 1" > "$m/database-acls.txt"
  psql_c "select coalesce(d.datname,'*'), coalesce(r.rolname,'*'), s.setconfig
          from pg_db_role_setting s left join pg_database d on d.oid=s.setdatabase
          left join pg_roles r on r.oid=s.setrole order by 1,2" > "$m/db-role-settings.txt"
  psql_c "select r.rolname, m.rolname from pg_auth_members a join pg_roles r on r.oid=a.roleid
          join pg_roles m on m.oid=a.member where r.rolname !~ '^pg_' order by 1,2" > "$m/role-memberships.txt"
  psql_c "select rolname, rolsuper, rolcanlogin from pg_roles where rolname !~ '^pg_' order by 1" > "$m/roles.txt"
}
