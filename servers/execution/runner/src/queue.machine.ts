import type { ScriptStatus, StoredMachine } from './dto/fsm.dto.js';

// The machine of the state machine service, in one row; its state is
// NULL before the first transition
export const MACHINE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS machine (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state TEXT,
    entry INTEGER NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`;

export const SAVE_MACHINE = `INSERT OR REPLACE INTO machine
  (id, state, entry, status, updated_at)
  VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)`;

export const LOAD_MACHINE =
  'SELECT state, entry, status FROM machine WHERE id = 1';

// datetime() writes the time in the format of CURRENT_TIMESTAMP
export const MARK_INTERRUPTED = `UPDATE commands
  SET status = 'interrupted', finished_at = datetime(?)
  WHERE finished_at IS NULL`;

export function toStoredMachine(
  row: Record<string, unknown> | undefined,
): StoredMachine | undefined {
  if (row === undefined) {
    return undefined;
  }
  return {
    state: typeof row.state === 'string' ? row.state : undefined,
    entry: Number(row.entry),
    status: row.status as ScriptStatus,
  };
}
