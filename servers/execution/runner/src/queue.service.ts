import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Injectable, Scope } from '@nestjs/common';
import {
  CommandRecord,
  CommandResult,
} from './interfaces/command.interface.js';
import { DatabaseMode } from './dto/health.dto.js';
import { HistoryEntryDto, HistoryQuery } from './dto/history.dto.js';
import { CommandCounts, ResourceTotals } from './dto/metrics.dto.js';
import { StoredMachine } from './dto/fsm.dto.js';
import { RunOutcome } from './interfaces/runner.interface.js';
import { ParameterValue } from './dto/parameters.dto.js';
import Changes, { ChangeListener } from './notify/changes.js';
import {
  LOAD_MACHINE,
  MARK_INTERRUPTED,
  SAVE_MACHINE,
  toStoredMachine,
} from './queue.machine.js';
import { INSERT_PEER, PEER_SWITCHES, toSwitches } from './queue.peers.js';
import { createSchema } from './queue.schema.js';
import {
  COMMAND_COUNTS,
  HISTORY,
  LAST_ID,
  RECORD,
  RECORD_BY_KEY,
  RESOURCE_TOTALS,
  toCommandCounts,
  toHistoryEntry,
  toRecord,
  toResourceTotals,
} from './queue.history.js';

// The status of a finished command in the commands table; a command
// that is not permitted keeps the default, invalid
const STATUS: Record<RunOutcome, string> = {
  success: 'valid',
  failed: 'failed',
  stopped: 'stopped',
};

// Runs the work in one transaction, which an error rolls back
function inTransaction(db: DatabaseSync, work: () => void): void {
  db.exec('BEGIN');
  try {
    work();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Keeps the received commands and their results in SQLite, in memory
// unless open() names a database file
@Injectable({ scope: Scope.DEFAULT })
export default class Queue {
  private db = Queue.connect(':memory:');

  // Signals a command that starts or finishes
  private readonly changes = new Changes();

  // The highest id before this start, and the rows it marked interrupted
  private start = { id: 0, interrupted: 0 };

  onChange(listener: ChangeListener): void {
    this.changes.on(listener);
  }

  open(file: string | undefined): void {
    if (file !== undefined) {
      mkdirSync(dirname(file), { recursive: true });
      this.db.close();
      this.db = Queue.connect(file);
    }
  }

  // a second close, as from a second shutdown, does nothing
  close(): void {
    if (this.db.isOpen) {
      this.db.close();
    }
  }

  // waits up to five seconds for a database file that is locked
  private static connect(file: string): DatabaseSync {
    const db = new DatabaseSync(file, { timeout: 5000 });
    createSchema(db);
    return db;
  }

  // by is the caller that submitted the command, if one did
  enqueue(name: string, requestKey?: string, by?: string): number {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO commands (name, by) VALUES (?, ?)')
      .run(name, by ?? null);
    const id = Number(lastInsertRowid);
    if (requestKey !== undefined) {
      this.addKey(requestKey, id);
    }
    this.changes.emit();
    return id;
  }

  addKey(requestKey: string, commandId: number): void {
    this.db
      .prepare(
        'INSERT INTO request_keys (request_key, command_id) VALUES (?, ?)',
      )
      .run(requestKey, commandId);
  }

  complete(
    id: number,
    [outcome, logs, exitCode, resources]: CommandResult,
  ): void {
    this.db
      .prepare(
        `UPDATE commands SET status = ?, stdout = ?, stderr = ?,
          exit_code = ?, cpu_seconds = ?, peak_rss_bytes = ?,
          processes = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(
        STATUS[outcome],
        logs.get('stdout') ?? '',
        logs.get('stderr') ?? '',
        exitCode,
        resources.cpuSeconds,
        resources.peakRssBytes,
        resources.processes,
        id,
      );
    this.changes.emit();
  }

  // Finishes a command that is not permitted, which stays invalid
  refuse(id: number): void {
    this.db
      .prepare(
        'UPDATE commands SET finished_at = CURRENT_TIMESTAMP WHERE id = ?',
      )
      .run(id);
    this.changes.emit();
  }

  history({ since, limit }: HistoryQuery): HistoryEntryDto[] {
    return this.db
      .prepare(HISTORY)
      .all({ since: since ?? null, limit })
      .map(toHistoryEntry);
  }

  // The commands received since the start, by status
  commandCounts(): CommandCounts {
    const rows = this.db.prepare(COMMAND_COUNTS).all(this.start.id);
    return toCommandCounts(rows, this.start.interrupted);
  }

  // The resources of the commands received since the start, by name
  resourceTotals(): ResourceTotals {
    const rows = this.db.prepare(RESOURCE_TOTALS).all(this.start.id);
    return toResourceTotals(rows);
  }

  activeCommand(): CommandRecord | undefined {
    return toRecord(
      this.db.prepare(`${RECORD} ORDER BY id DESC LIMIT 1`).get(),
    );
  }

  findByKey(requestKey: string): CommandRecord | undefined {
    return toRecord(this.db.prepare(RECORD_BY_KEY).get(requestKey));
  }

  // an in-memory database has no location
  mode(): DatabaseMode {
    return this.db.location() === null ? 'memory' : 'file';
  }

  // Records the changes of one request together, or none of them
  setParameters(changes: ReadonlyMap<string, ParameterValue>): void {
    const insert = this.db.prepare(
      'INSERT INTO parameters (name, value, changed_at) VALUES (?, ?, ?)',
    );
    const time = new Date().toISOString();
    inTransaction(this.db, () =>
      changes.forEach((value, name) =>
        insert.run(name, JSON.stringify(value), time),
      ),
    );
  }

  // The latest value of each parameter; the highest id is the latest,
  // as two changes can share a timestamp
  parameterValues(): Record<string, ParameterValue> {
    const rows = this.db
      .prepare(
        `SELECT name, value FROM parameters WHERE id IN
          (SELECT MAX(id) FROM parameters GROUP BY name)`,
      )
      .all();
    return Object.fromEntries(
      rows.map(({ name, value }) => [String(name), JSON.parse(String(value))]),
    );
  }

  // Records the switches of one request together, or none of them
  setPeers(changes: ReadonlyMap<string, boolean>): void {
    const insert = this.db.prepare(INSERT_PEER);
    const time = new Date().toISOString();
    inTransaction(this.db, () =>
      changes.forEach((enabled, id) => insert.run(id, Number(enabled), time)),
    );
  }

  // The latest switch of each peer that PUT /peers changed
  peerSwitches(): Map<string, boolean> {
    return toSwitches(this.db.prepare(PEER_SWITCHES).all());
  }

  // The machine of the state machine service, which no change signals
  saveMachine({ state, entry, status }: StoredMachine): void {
    this.db.prepare(SAVE_MACHINE).run(state ?? null, entry, status);
  }

  loadMachine(): StoredMachine | undefined {
    return toStoredMachine(this.db.prepare(LOAD_MACHINE).get());
  }

  // Marks the commands that never finished, as no script survives a
  // restart; time is an ISO 8601 time. Runs once, at the start, which
  // the command counts begin from.
  markInterrupted(time: string): void {
    const { changes } = this.db.prepare(MARK_INTERRUPTED).run(time);
    const last = this.db.prepare(LAST_ID).get();
    this.start = { id: Number(last?.id), interrupted: Number(changes) };
  }
}
