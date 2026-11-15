#!/usr/bin/env bash
# Back up selected DTaaS platform services on the SOURCE host (run it there).
# Only the services named in --services are touched; each has its own module in
# services/<name>.sh with estimate_<name> and backup_<name> functions.
#
# Services: postgres thingsboard grafana influxdb mongodb rabbitmq   (or: all)
#
# All backups are logical, so they restore into newer images. Each service is
# found from its running container, not from one project dir. No sudo needed.
#
# Usage:
#   ./backup.sh --services <list|all> --target-host <host> [--source-host <host>]
#               [--estimate] [--stop-tb] [--mongo-gzip]
#     --services     comma-separated list, e.g. "influxdb" or "postgres,thingsboard,grafana"
#     --estimate     only print the expected backup size per service; write nothing
#     --stop-tb      (thingsboard) stop ThingsBoard before any dump, leave it STOPPED
#     --mongo-gzip   (mongodb) gzip the archive
#
# Env overrides: BACKUP_ROOT, <SERVICE>_CONTAINER (e.g. MONGODB_CONTAINER)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$(cd "$SCRIPT_DIR/../../../.." && pwd)/backups}"
# Fixed order: postgres before thingsboard, so a combined run dumps the DB once.
ALL_SERVICES="postgres thingsboard grafana influxdb mongodb rabbitmq"
declare -A CONTAINER=(
  [postgres]="${POSTGRES_CONTAINER:-postgres}"
  [thingsboard]="${THINGSBOARD_CONTAINER:-thingsboard}"
  [grafana]="${GRAFANA_CONTAINER:-grafana}"
  [influxdb]="${INFLUXDB_CONTAINER:-influxdb}"
  [mongodb]="${MONGODB_CONTAINER:-mongodb}"
  [rabbitmq]="${RABBITMQ_CONTAINER:-rabbitmq}"
)

REQUESTED=""
SOURCE_HOST="$(hostname)"
TARGET_HOST=""
ESTIMATE=false
STOP_TB=false
MONGO_GZIP=false
while (( $# )); do
  case "$1" in
    --services) REQUESTED="${2:?--services needs a value}"; shift ;;
    --source-host) SOURCE_HOST="${2:?--source-host needs a value}"; shift ;;
    --target-host) TARGET_HOST="${2:?--target-host needs a value}"; shift ;;
    --estimate) ESTIMATE=true ;;
    --stop-tb) STOP_TB=true ;;
    --mongo-gzip) MONGO_GZIP=true ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

# ------------------------------------------------------------------ selection
[[ -n "$REQUESTED" ]] || { echo "ERROR: --services is required (e.g. --services influxdb, or --services all)" >&2; exit 2; }
[[ "$REQUESTED" == all ]] && REQUESTED="${ALL_SERVICES// /,}"
declare -A WANT=()
for s in ${REQUESTED//,/ }; do
  [[ " $ALL_SERVICES " == *" $s "* ]] || { echo "ERROR: unknown service '$s' (valid: ${ALL_SERVICES// /, }, all)" >&2; exit 2; }
  WANT[$s]=1
done
SELECTED=""
for s in $ALL_SERVICES; do [[ -n "${WANT[$s]:-}" ]] && SELECTED+="$s "; done
SELECTED="${SELECTED% }"
selected() { [[ -n "${WANT[$1]:-}" ]]; }
if $STOP_TB && ! selected thingsboard; then echo "ERROR: --stop-tb needs thingsboard in --services" >&2; exit 2; fi
$ESTIMATE || [[ -n "$TARGET_HOST" ]] || { echo "ERROR: --target-host is required" >&2; exit 2; }
[[ "$SOURCE_HOST" == "$(hostname)" ]] || echo "WARNING: --source-host '$SOURCE_HOST' differs from hostname '$(hostname)'" >&2

# ------------------------------------------------------------------ shared helpers (used by modules)
running()   { docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null | grep -qx true; }
mount_src() { docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$2\"}}{{.Source}}{{end}}{{end}}" "$1"; }
label()     { docker inspect -f "{{index .Config.Labels \"$2\"}}" "$1" 2>/dev/null; }
human()     { numfmt --to=si --suffix=B --format='%.2f' "${1:-0}"; }
log()       { if [[ -n "${LOG:-}" ]]; then echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; else echo "$*"; fi; }
die()       { log "ERROR: $*" >&2; exit 1; }
WARNINGS=()
warn()      { log "WARNING: $*"; WARNINGS+=("$*"); }

for s in $SELECTED; do
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/services/$s.sh"
done

# ------------------------------------------------------------------ estimate
if $ESTIMATE; then
  printf "%-12s %-32s %s\n" service image "expected backup size"
  total=0
  for s in $SELECTED; do
    c="${CONTAINER[$s]}"
    if ! running "$c"; then printf "%-12s %-32s %s\n" "$s" "-" "container '$c' not running"; continue; fi
    b="$("estimate_$s")"; total=$(( total + b ))
    printf "%-12s %-32s %s\n" "$s" "$(docker inspect -f '{{.Config.Image}}' "$c")" "$(human "$b")"
  done
  echo "TOTAL (approx.): $(human "$total");  free in $(df --output=target "$(dirname "$BACKUP_ROOT")" | tail -1): $(human "$(( $(df --output=avail -B1 "$(dirname "$BACKUP_ROOT")" | tail -1) ))")"
  exit 0
fi

# ------------------------------------------------------------------ setup
TS="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_ROOT}/${TS}"
umask 077
mkdir -p "$OUT"
LOG="$OUT/backup.log"; : > "$LOG"

log "Backup directory: ${OUT}"
log "Source host: ${SOURCE_HOST} (hostname: $(hostname)); target host: ${TARGET_HOST}"
log "Services: ${SELECTED}"

need=0
for s in $SELECTED; do
  # thingsboard can be backed up while stopped (--stop-tb or already stopped); it needs postgres running.
  if [[ $s == thingsboard ]]; then
    running "${CONTAINER[postgres]}" || die "thingsboard needs the '${CONTAINER[postgres]}' container running (its data is in Postgres)"
  else
    running "${CONTAINER[$s]}" || die "container '${CONTAINER[$s]}' for ${s} is not running"
  fi
  need=$(( need + $("estimate_$s") ))
done
free="$(df --output=avail -B1 "$OUT" | tail -1)"
log "Expected size: $(human "$need"); free: $(human "$free")"
(( free > need + need / 10 )) || die "not enough free space in ${BACKUP_ROOT}"

{
  echo "timestamp=${TS}"
  echo "source_host=${SOURCE_HOST}"
  echo "hostname=$(hostname)"
  echo "target_host=${TARGET_HOST}"
  echo "services=${SELECTED// /,}"
} > "$OUT/info.txt"

# Per-service metadata: image, ports, mounts, compose origin.
service_meta() {
  local s=$1 c=${CONTAINER[$1]} d="$OUT/$1"
  mkdir -p "$d"
  {
    echo "container=${c}"
    echo "image=$(docker inspect -f '{{.Config.Image}}' "$c")"
    echo "status=$(docker inspect -f '{{.State.Status}}' "$c")"
    echo "ports=$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$c")"
    echo "compose_project=$(label "$c" com.docker.compose.project)"
    echo "compose_service=$(label "$c" com.docker.compose.service)"
    echo "compose_dir=$(label "$c" com.docker.compose.project.working_dir)"
    echo "compose_files=$(label "$c" com.docker.compose.project.config_files)"
  } > "$d/service.txt"
  docker inspect -f '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}' "$c" > "$d/mounts.txt"
  docker inspect "$c" > "$d/docker-inspect.json"   # contains env passwords; dir is mode 700
  save_project "$c"
}

# Project-level config (compose files, env, credentials), saved once per install dir.
declare -A SAVED_PROJECT=()
save_project() {
  local c=$1 dir files key f
  dir="$(label "$c" com.docker.compose.project.working_dir)"
  [[ -n "$dir" && -d "$dir" ]] || return 0
  [[ -n "${SAVED_PROJECT[$dir]:-}" ]] && return 0
  SAVED_PROJECT[$dir]=1
  key="$(echo "${dir#/}" | tr '/' '_')"
  mkdir -p "$OUT/projects/$key"
  echo "$dir" > "$OUT/projects/$key/PROJECT_DIR"
  files="$(label "$c" com.docker.compose.project.config_files)"
  for f in ${files//,/ }; do [[ -r "$f" ]] && cp -p "$f" "$OUT/projects/$key/"; done
  for f in config/services.env config/.env .env config/credentials.csv credentials.csv \
           config/password.env.current config/gitlab_oauth.json; do
    [[ -e "$dir/$f" ]] || continue
    if [[ -r "$dir/$f" ]]; then
      mkdir -p "$OUT/projects/$key/$(dirname "$f")"
      cp -p "$dir/$f" "$OUT/projects/$key/$f"
    else
      mkdir -p "$OUT/projects/$key/$(dirname "$f")"
      warn "$dir/$f is not readable; copy it yourself, in your own terminal:"
      warn "  sudo install -m 600 -o $(id -u) $dir/$f $OUT/projects/$key/$f"
    fi
  done
  log "project config saved: $dir"
}

# ------------------------------------------------------------------ run
if $STOP_TB; then
  if running "${CONTAINER[thingsboard]}"; then
    log "Stopping ${CONTAINER[thingsboard]} before any dump (it will be left stopped)"
    docker stop -t 120 "${CONTAINER[thingsboard]}" >/dev/null
  else
    log "${CONTAINER[thingsboard]} already stopped"
  fi
  echo "tb_stopped_for_backup=true" >> "$OUT/info.txt"
fi

for s in $SELECTED; do
  log "=== ${s}"
  service_meta "$s"
  "backup_$s"
done

( cd "$OUT" && find . -type f ! -name SHA256SUMS ! -name backup.log -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS )
chmod -R go-rwx "$OUT"
log "Done. Backup at ${OUT} ($(du -sh "$OUT" | cut -f1))"
log "Copy to ${TARGET_HOST} with:  rsync -a --progress ${OUT} ${TARGET_HOST}:<dest>/"
log "Verify there with:          cd <dest>/${TS} && sha256sum -c SHA256SUMS"
$STOP_TB && log "NOTE: ${CONTAINER[thingsboard]} is STOPPED. 'docker start ${CONTAINER[thingsboard]}' if this was not the final cutover."
if (( ${#WARNINGS[@]} )); then
  log "----- ${#WARNINGS[@]} warning line(s):"
  for w in "${WARNINGS[@]}"; do log "  $w"; done
  log "Files copied by hand are not in SHA256SUMS."
fi
exit 0
