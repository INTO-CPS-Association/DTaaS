# Restore: postgres and thingsboard

The full, tested procedure (postgres 16 -> 18.6, ThingsBoard CE 4.2.1 -> 4.3.1.8, never 4.4) is in
`.claude/skills/tb-postgres-migration/SKILL.md`, sections 2 and 3. Follow it with these path mappings
for backups made by `dtaas-services-backup`:

| tb-postgres-migration path | dtaas-services-backup path |
|---|---|
| `db/globals.sql`, `db/<db>.dump` | `postgres/db/...` (all DBs). `thingsboard/db/...` always holds its own copy of the `thingsboard` DB + roles. |
| `meta/databases.txt`, `meta/roles.txt`, `meta/database-acls.txt`, ... | `postgres/meta/...`. `thingsboard/meta/` has `roles.txt`, `database-acls.txt` too. |
| `meta/tb-counts.txt`, `meta/tb-schema-version.txt` | `thingsboard/meta/...` |
| `config/services.env`, `credentials.csv`, `password.env.current`, compose files | `projects/<install-dir>/...` |
| `config/certs.tar.gz` | `postgres/certs.tar.gz` (postgres.crt/key), `thingsboard/certs.tar.gz` (thingsboard-*.pem). The target needs its own certs anyway. |
| `config/thingsboard-data.tar.gz` | `thingsboard/thingsboard-data.tar.gz` |

`thingsboard/meta/tb-info.txt` says where the thingsboard DB dump is (`database_dump=`).

- **postgres only:** restore all databases and roles; skip the ThingsBoard upgrade steps. If the dump
  includes `thingsboard`, ThingsBoard must not be started against it until it has been upgraded.
- **thingsboard only:** the backup contains only the `thingsboard` DB and the roles. Other databases
  (e.g. `swim`) are not in it.
- **both:** restore `thingsboard` from **one** of the two dumps, never both (the second `--create` fails
  because the DB exists). Prefer `thingsboard/db/thingsboard.dump`, and restore the other databases from
  `postgres/db/` (skip `postgres/db/thingsboard.dump`).
