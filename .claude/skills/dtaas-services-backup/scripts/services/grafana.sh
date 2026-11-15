# grafana: the whole /var/lib/grafana (grafana.db SQLite + plugins, csv/pdf/png), read through the
# container because grafana.db is root-only on the host. A hot copy of SQLite can catch a write in
# progress, so grafana.db is integrity-checked and the copy retried.
GF_C="${CONTAINER[grafana]}"

estimate_grafana() { docker exec "$GF_C" du -sb /var/lib/grafana | cut -f1; }

backup_grafana() {
  local d="$OUT/grafana" ok=false i
  for i in 1 2 3; do
    docker exec "$GF_C" tar -C /var/lib --numeric-owner -cpf - grafana > "$d/grafana-data.tar"
    rm -rf "$d/check" && mkdir "$d/check"
    tar -C "$d/check" -xf "$d/grafana-data.tar" grafana/grafana.db
    if [[ "$(python3 -I -c 'import sqlite3,sys; print(sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True).execute("pragma integrity_check").fetchone()[0])' "$d/check/grafana/grafana.db")" == ok ]]; then
      ok=true; break
    fi
    log "grafana: integrity check failed on attempt $i, retrying"; sleep 2
  done
  $ok || { rm -rf "$d/check"; die "grafana: grafana.db failed integrity check 3 times"; }
  python3 -I - "$d/check/grafana/grafana.db" > "$d/counts.txt" <<'PY'
import sqlite3, sys
con = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
for t in ("org", "user", "dashboard", "data_source", "folder", "alert_rule", "api_key", "team"):
    try:
        print(f"{t}|{con.execute(f'select count(*) from {t}').fetchone()[0]}")
    except sqlite3.Error:
        pass
PY
  rm -rf "$d/check"
  log "grafana: $(du -h "$d/grafana-data.tar" | cut -f1), integrity ok, counts: $(tr '\n' ' ' < "$d/counts.txt")"
}
