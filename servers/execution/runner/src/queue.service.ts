import { DatabaseSync } from 'node:sqlite';
import { Injectable, OnApplicationShutdown, Scope } from '@nestjs/common';
import {
  CommandRecord,
  CommandResult,
} from './interfaces/command.interface.js';
import { ExecuteCommandDto } from './dto/command.dto.js';

// request_key is the optional key a client sends to mark repeated requests
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invalid',
    stdout TEXT NOT NULL DEFAULT '',
    stderr TEXT NOT NULL DEFAULT '',
    request_key TEXT UNIQUE,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT
  )`;

const RECORD = `SELECT id, name, status, stdout, stderr,
  finished_at IS NOT NULL AS finished FROM commands`;

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
export default class Queue implements OnApplicationShutdown {
  private db = Queue.connect(':memory:');

  open(file: string): void {
    this.db.close();
    this.db = Queue.connect(file);
  }

  onApplicationShutdown(): void {
    this.db.close();
  }

  private static connect(file: string): DatabaseSync {
    const db = new DatabaseSync(file);
    db.exec(SCHEMA);
    return db;
  }

  enqueue(name: string, requestKey?: string): number {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO commands (name, request_key) VALUES (?, ?)')
      .run(name, requestKey ?? null);
    return Number(lastInsertRowid);
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
    return toRecord(
      this.db.prepare(`${RECORD} WHERE request_key = ?`).get(requestKey),
    );
  }
}
