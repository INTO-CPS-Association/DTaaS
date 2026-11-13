#!/usr/bin/env bash
# Backup PostgreSQL + ThingsBoard on the SOURCE host (run it there) for migration
# to a TARGET host running a newer postgres / thingsboard.
#
# A postgres major upgrade cannot reuse the data directory, so this script
# produces LOGICAL dumps (pg_dumpall globals + pg_dump -Fc per database),
# plus the configs/certs needed to rebuild the services, plus verification data.
# No sudo needed (only docker access).
#
# Usage:
#   ./backup-tb-postgres.sh --source-host <host> --target-host <host> [--stop-tb]
#     --source-host  name of this host (default: output of `hostname`)
#     --target-host  host the backup will be restored on (used in metadata/hints)
#     --stop-tb      stop ThingsBoard first (final cutover backup: no writes
#                    after the dump); ThingsBoard is left STOPPED.
#
# The dtaas-services project directory (made by `dtaas-services project generate`)
# is discovered from the postgres container's compose label; PROJECT_DIR overrides it.
#
# Env overrides: PROJECT_DIR, BACKUP_ROOT, PG_CONTAINER, TB_CONTAINER

set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-$(cd "$(dirname "$(readlink -f "$0")")/../../../.." && pwd)/backups}"
PG_CONTAINER="${PG_CONTAINER:-postgres}"
TB_CONTAINER="${TB_CONTAINER:-thingsboard}"
PROJECT_DIR="${PROJECT_DIR:-$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$PG_CONTAINER" 2>/dev/null || true)}"
if [[ -z "$PROJECT_DIR" || ! -f "$PROJECT_DIR/config/services.env" ]]; then
  echo "ERROR: dtaas-services project dir not found (got '${PROJECT_DIR}'); set PROJECT_DIR" >&2
  exit 2
fi

STOP_TB=false
SOURCE_HOST="$(hostname)"
TARGET_HOST=""
while (( $# )); do
  case "$1" in
    --stop-tb) STOP_TB=true ;;
    --source-host) SOURCE_HOST="${2:?--source-host needs a value}"; shift ;;
    --target-host) TARGET_HOST="${2:?--target-host needs a value}"; shift ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done
[[ -n "$TARGET_HOST" ]] || { echo "ERROR: --target-host is required" >&2; exit 2; }
if [[ "$SOURCE_HOST" != "$(hostname)" ]]; then
  echo "WARNING: --source-host '$SOURCE_HOST' differs from hostname '$(hostname)'" >&2
fi

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_ROOT}/${TS}"
LOG="${OUT}/backup.log"

log()  { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
die()  { echo "ERROR: $*" | tee -a "$LOG" >&2; exit 1; }

umask 077
mkdir -p "${OUT}"/{db,meta,config}
: > "$LOG"

# ---------------------------------------------------------------- preflight
log "Backup directory: ${OUT}"
log "Source host: ${SOURCE_HOST} (hostname: $(hostname)); target host: ${TARGET_HOST}"

docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -qx true \
  || die "container '${PG_CONTAINER}' is not running"

PG_USER="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$PG_CONTAINER" \
           | sed -n 's/^POSTGRES_USER=//p')"
[[ -n "$PG_USER" ]] || die "could not read POSTGRES_USER from ${PG_CONTAINER}"

# Connect via the container's local unix socket (no password needed in the official image).
psql_c() { docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "${2:-postgres}" -XAtqc "$1"; }
psql_c 'select 1' >/dev/null || die "cannot connect to postgres as ${PG_USER}"

DB_BYTES="$(psql_c "select coalesce(sum(pg_database_size(datname)),0) from pg_database")"
FREE_BYTES="$(df --output=avail -B1 "$OUT" | tail -1)"
log "Total database size: $(numfmt --to=iec "$DB_BYTES"); free space: $(numfmt --to=iec "$FREE_BYTES")"
# Compressed dumps are usually far smaller than on-disk size; require 1x as a safe margin.
(( FREE_BYTES > DB_BYTES )) || die "not enough free space in ${BACKUP_ROOT}"

# ---------------------------------------------------------------- optional TB stop
if $STOP_TB; then
  if docker inspect -f '{{.State.Running}}' "$TB_CONTAINER" 2>/dev/null | grep -qx true; then
    log "Stopping ${TB_CONTAINER} (it will be left stopped)"
    docker stop -t 120 "$TB_CONTAINER" >/dev/null
  else
    log "${TB_CONTAINER} already stopped"
  fi
fi

# ---------------------------------------------------------------- metadata
log "Collecting metadata"
{
  echo "timestamp=${TS}"
  echo "source_host=${SOURCE_HOST}"
  echo "hostname=$(hostname)"
  echo "target_host=${TARGET_HOST}"
  echo "project_dir=${PROJECT_DIR}"
  echo "compose_files=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$PG_CONTAINER")"
  if [[ -x "${PROJECT_DIR}/.venv/bin/pip" ]]; then
    echo "dtaas_services_version=$("${PROJECT_DIR}/.venv/bin/pip" show dtaas-services 2>/dev/null | sed -n 's/^Version: //p')"
  else
    echo "dtaas_services_version=$(pip show dtaas-services 2>/dev/null | sed -n 's/^Version: //p')"
  fi
  echo "tb_stopped_for_backup=${STOP_TB}"
  echo "pg_image=$(docker inspect -f '{{.Config.Image}}' "$PG_CONTAINER")"
  echo "tb_image=$(docker inspect -f '{{.Config.Image}}' "$TB_CONTAINER" 2>/dev/null || echo n/a)"
  echo "pg_server_version=$(psql_c 'show server_version')"
  echo "pg_dump_version=$(docker exec "$PG_CONTAINER" pg_dump --version)"
  echo "pg_user=${PG_USER}"
} > "${OUT}/meta/info.txt"

psql_c "select datname, pg_encoding_to_char(encoding), datcollate, datctype, pg_size_pretty(pg_database_size(datname))
        from pg_database order by 1" > "${OUT}/meta/databases.txt"
psql_c "select rolname, rolsuper, rolcanlogin from pg_roles where rolname !~ '^pg_' order by 1" \
  > "${OUT}/meta/roles.txt"
psql_c "select name, setting from pg_settings where source not in ('default','override') order by 1" \
  > "${OUT}/meta/settings.txt"
docker exec "$PG_CONTAINER" cat /var/lib/postgresql/data/pgdata/pg_hba.conf > "${OUT}/meta/pg_hba.conf" 2>/dev/null || true
docker inspect "$PG_CONTAINER" "$TB_CONTAINER" > "${OUT}/meta/docker-inspect.json" 2>/dev/null || true

DBS="$(psql_c "select datname from pg_database where not datistemplate and datname <> 'postgres' order by 1")"
log "Databases to dump: $(echo $DBS)"

for db in $DBS; do
  psql_c "select extname, extversion from pg_extension order by 1" "$db" > "${OUT}/meta/extensions.${db}.txt"
  psql_c "select schemaname||'.'||relname, n_live_tup from pg_stat_user_tables order by 1" "$db" \
    > "${OUT}/meta/table-estimates.${db}.txt"
done

# Exact counts of key ThingsBoard tables, for comparison after restore + upgrade.
if echo "$DBS" | grep -qx thingsboard; then
  : > "${OUT}/meta/tb-counts.txt"
  for t in tenant customer tb_user device asset dashboard entity_view rule_chain rule_node \
           device_profile asset_profile widgets_bundle widget_type attribute_kv ts_kv_latest; do
    if [[ "$(psql_c "select to_regclass('public.${t}') is not null" thingsboard)" == t ]]; then
      echo "${t}|$(psql_c "select count(*) from public.${t}" thingsboard)" >> "${OUT}/meta/tb-counts.txt"
    fi
  done
  psql_c "select * from tb_schema_settings" thingsboard > "${OUT}/meta/tb-schema-version.txt" 2>/dev/null || true
fi

# Database-level owner/ACL/settings and role memberships, to verify after restore.
psql_c "select datname, pg_get_userbyid(datdba), coalesce(datacl::text,'<default>')
        from pg_database where not datistemplate order by 1" > "${OUT}/meta/database-acls.txt"
psql_c "select coalesce(d.datname,'*'), coalesce(r.rolname,'*'), s.setconfig
        from pg_db_role_setting s left join pg_database d on d.oid=s.setdatabase
        left join pg_roles r on r.oid=s.setrole order by 1,2" > "${OUT}/meta/db-role-settings.txt"
psql_c "select r.rolname, m.rolname from pg_auth_members a join pg_roles r on r.oid=a.roleid
        join pg_roles m on m.oid=a.member where r.rolname !~ '^pg_' order by 1,2" > "${OUT}/meta/role-memberships.txt"

# ---------------------------------------------------------------- dumps
log "Dumping globals (roles, tablespaces)"
docker exec "$PG_CONTAINER" pg_dumpall -U "$PG_USER" --globals-only > "${OUT}/db/globals.sql"

for db in $DBS; do
  log "Dumping database '${db}'"
  # --create puts the DATABASE entry (owner, encoding, locale) plus its ACL
  # (e.g. GRANT CONNECT) and ALTER DATABASE settings into the archive; they are
  # applied by `pg_restore --create`. Without it, database-level grants are lost.
  docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$db" -Fc -Z 6 --create \
    > "${OUT}/db/${db}.dump"
  # Validate the archive is readable (lists the TOC, does not restore).
  # (--create is needed for the listing to show the DATABASE and its ACL entries.)
  docker exec -i "$PG_CONTAINER" pg_restore --list --create < "${OUT}/db/${db}.dump" > "${OUT}/db/${db}.toc" \
    || die "dump of ${db} failed validation"
  grep -qE " DATABASE - ${db} " "${OUT}/db/${db}.toc" || die "dump of ${db} has no DATABASE entry"
  log "  ${db}.dump: $(du -h "${OUT}/db/${db}.dump" | cut -f1), $(grep -c 'TABLE DATA' "${OUT}/db/${db}.toc") table-data entries"
done

# ---------------------------------------------------------------- configs and certs
log "Archiving compose files, env and certs"
cp -p "${PROJECT_DIR}"/compose.*.yml "${OUT}/config/"
cp -p "${PROJECT_DIR}/config/services.env" "${OUT}/config/"
[[ -f "${PROJECT_DIR}/config/credentials.csv" ]] && cp -p "${PROJECT_DIR}/config/credentials.csv" "${OUT}/config/"
# password.env.current is managed by the dtaas-services CLI (tracks the live service
# passwords that `user reset-password` relies on). It is often root-only.
if [[ -r "${PROJECT_DIR}/config/password.env.current" ]]; then
  cp -p "${PROJECT_DIR}/config/password.env.current" "${OUT}/config/"
elif [[ -e "${PROJECT_DIR}/config/password.env.current" ]]; then
  log "WARNING: config/password.env.current is not readable; copy it manually:"
  log "  sudo install -m 600 -o $(id -u) ${PROJECT_DIR}/config/password.env.current ${OUT}/config/"
fi
# certs/ contains root-only keys; it is bind-mounted at /etc/ssl in the postgres
# container, so read it from there (as root inside the container) instead of using sudo.
docker exec "$PG_CONTAINER" tar -C /etc --numeric-owner -czpf - ssl > "${OUT}/config/certs.tar.gz" \
  || die "could not archive certs via ${PG_CONTAINER}"
log "  certs.tar.gz: $(tar -tzf "${OUT}/config/certs.tar.gz" | grep -vc '/$') files"
# data/thingsboard is world-readable (and normally empty); warn rather than fail.
tar -C "$PROJECT_DIR" --numeric-owner -czpf "${OUT}/config/thingsboard-data.tar.gz" data/thingsboard \
  || log "WARNING: could not fully archive data/thingsboard"

# ---------------------------------------------------------------- checksums
( cd "$OUT" && find db config meta -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS )

chmod -R go-rwx "$OUT"
log "Done. Backup at ${OUT} ($(du -sh "$OUT" | cut -f1))"
log "Copy to ${TARGET_HOST} with:  rsync -a --progress ${OUT} ${TARGET_HOST}:<dest>/"
log "Verify there with:          cd <dest>/${TS} && sha256sum -c SHA256SUMS"
$STOP_TB && log "NOTE: ${TB_CONTAINER} is STOPPED. Start with 'docker start ${TB_CONTAINER}' if this was not the final cutover."
exit 0
