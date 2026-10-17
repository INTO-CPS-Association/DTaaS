import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Injectable, Scope } from '@nestjs/common';
import {
  CommandRecord,
  CommandResult,
} from './interfaces/command.interface.js';
import { ExecuteCommandDto } from './dto/command.dto.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invalid',
    stdout TEXT NOT NULL DEFAULT '',
    stderr TEXT NOT NULL DEFAULT '',
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT
  );
  -- the keys with which clients mark requests, and the command each
  -- request ran or joined
  CREATE TABLE IF NOT EXISTS request_keys (
    request_key TEXT PRIMARY KEY,
    command_id INTEGER NOT NULL REFERENCES commands (id)
  )`;

const RECORD = `SELECT id, name, status, stdout, stderr,
  finished_at IS NOT NULL AS finished FROM commands`;

const RECORD_BY_KEY = `${RECORD} WHERE id =
  (SELECT command_id FROM request_keys WHERE request_key = ?)`;

function toRecord(
  row: Record<string, unknown> | undefined,
): CommandRecord | undefined {
  if (row === undefined) {
    return undefined;
  }
  return {
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status),
    stdout: String(row.stdout),
    stderr: String(row.stderr),
    finished: Boolean(row.finished),
  };
}

// Keeps the received commands and their results in SQLite, in memory
// unless open() names a database file
@Injectable({ scope: Scope.DEFAULT })
export default class Queue {
  private db = Queue.connect(':memory:');

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
    db.exec(SCHEMA);
    return db;
  }

  enqueue(name: string, requestKey?: string): number {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO commands (name) VALUES (?)')
      .run(name);
    const id = Number(lastInsertRowid);
    if (requestKey !== undefined) {
      this.addKey(requestKey, id);
    }
    return id;
  }

  addKey(requestKey: string, commandId: number): void {
    this.db
      .prepare(
        'INSERT INTO request_keys (request_key, command_id) VALUES (?, ?)',
      )
      .run(requestKey, commandId);
  }

  complete(id: number, [success, logs]: CommandResult): void {
    this.db
      .prepare(
        `UPDATE commands SET status = ?, stdout = ?, stderr = ?,
          finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(
        success ? 'valid' : 'invalid',
        logs.get('stdout') ?? '',
        logs.get('stderr') ?? '',
        id,
      );
  }

  checkHistory(): Array<ExecuteCommandDto> {
    return this.db
      .prepare('SELECT name FROM commands ORDER BY id')
      .all()
      .map(({ name }) => ({ name: String(name) }));
  }

  activeCommand(): CommandRecord | undefined {
    return toRecord(
      this.db.prepare(`${RECORD} ORDER BY id DESC LIMIT 1`).get(),
    );
  }

  findByKey(requestKey: string): CommandRecord | undefined {
    return toRecord(this.db.prepare(RECORD_BY_KEY).get(requestKey));
  }
}
