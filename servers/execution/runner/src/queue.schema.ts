import { DatabaseSync } from 'node:sqlite';
import { MACHINE_SCHEMA } from './queue.machine.js';
import { PEERS_SCHEMA } from './queue.peers.js';

// by is the principal that submitted a command: a name of runner.yaml,
// script, or NULL without access control and for a state's script.
// cpu_seconds, peak_rss_bytes and processes are what the process tree of
// its script used, NULL when not measured.
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invalid',
    stdout TEXT NOT NULL DEFAULT '',
    stderr TEXT NOT NULL DEFAULT '',
    exit_code INTEGER,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT,
    by TEXT,
    cpu_seconds REAL,
    peak_rss_bytes INTEGER,
    processes INTEGER
  );
  -- the keys with which clients mark requests, and the command each
  -- request ran or joined
  CREATE TABLE IF NOT EXISTS request_keys (
    request_key TEXT PRIMARY KEY,
    command_id INTEGER NOT NULL REFERENCES commands (id)
  );
  -- each change of a parameter, with its value as JSON
  CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    changed_at TEXT NOT NULL
  );
  ${MACHINE_SCHEMA};
  ${PEERS_SCHEMA}`;

// Adds a column that the commands table of an older version lacks
function addColumn(db: DatabaseSync, column: string, type: string): void {
  const columns = db.prepare('PRAGMA table_info(commands)').all();
  if (!columns.some(({ name }) => name === column)) {
    db.exec(`ALTER TABLE commands ADD COLUMN ${column} ${type}`);
  }
}

// A database file of a version before 0.7.0 has no exit_code column,
// one before 0.9.0 no by column, one before issue 17a no resource
// columns, and one before issue 17b no processes column
export function createSchema(db: DatabaseSync): void {
  db.exec(SCHEMA);
  addColumn(db, 'exit_code', 'INTEGER');
  addColumn(db, 'by', 'TEXT');
  addColumn(db, 'cpu_seconds', 'REAL');
  addColumn(db, 'peak_rss_bytes', 'INTEGER');
  addColumn(db, 'processes', 'INTEGER');
}
