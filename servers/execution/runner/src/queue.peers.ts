// Each enabling or disabling of a peer by PUT /peers; the latest row of
// a peer, by rowid, overrides the enabled of runner.yaml
export const PEERS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS peers (
    id TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    changed_at TEXT NOT NULL
  )`;

export const INSERT_PEER =
  'INSERT INTO peers (id, enabled, changed_at) VALUES (?, ?, ?)';

// rowid rather than changed_at, as two changes can share a timestamp
export const PEER_SWITCHES = `SELECT id, enabled FROM peers WHERE rowid IN
  (SELECT MAX(rowid) FROM peers GROUP BY id)`;

export const toSwitches = (
  rows: Record<string, unknown>[],
): Map<string, boolean> =>
  new Map(rows.map(({ id, enabled }) => [String(id), Boolean(enabled)]));
