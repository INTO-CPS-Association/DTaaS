import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { commandState } from 'src/dto/state.dto';
import Queue from 'src/queue.service';
import { NO_RESOURCES } from 'src/resources/resources';
import { commandNames } from 'test/utils';

const STARTED = { state: 'execute', entry: 3, status: 'running' } as const;

const UNSTARTED = { state: undefined, entry: 0, status: 'none' } as const;

describe('Queue machine store', () => {
  let dir: string;
  let file: string;
  let queue: Queue;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-'));
    file = join(dir, 'runner.db');
    queue = new Queue();
  });

  afterEach(() => {
    queue.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('Should have no machine before the first save', () => {
    expect(queue.loadMachine()).toBeUndefined();
  });

  it('Should keep a started and an unstarted machine in one row', () => {
    queue.saveMachine(STARTED);
    expect(queue.loadMachine()).toEqual(STARTED);

    queue.saveMachine(UNSTARTED);
    expect(queue.loadMachine()).toEqual(UNSTARTED);
  });

  it('Should keep the machine in a database file across restarts', () => {
    queue.open(file);
    queue.saveMachine(STARTED);
    queue.close();

    queue = new Queue();
    queue.open(file);

    expect(queue.loadMachine()).toEqual(STARTED);
  });

  it('Should open a file of an earlier version with its commands', () => {
    const db = new DatabaseSync(file);
    db.exec(`CREATE TABLE commands (id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'invalid',
      stdout TEXT NOT NULL DEFAULT '', stderr TEXT NOT NULL DEFAULT '',
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at TEXT)`);
    db.exec("INSERT INTO commands (name) VALUES ('create')");
    db.close();

    queue.open(file);

    expect(commandNames(queue.history({ limit: 100 }))).toEqual(['create']);
    expect(queue.loadMachine()).toBeUndefined();
  });

  it('Should mark only the commands that did not finish as interrupted', () => {
    const finished = queue.enqueue('create', 'key-0');
    queue.complete(finished, ['success', new Map(), 0, NO_RESOURCES]);
    queue.enqueue('execute', 'key-1');

    queue.markInterrupted('2026-10-26T07:25:21.123Z');

    expect(queue.findByKey('key-1')).toMatchObject({
      status: 'interrupted',
      finished: true,
      finishedAt: '2026-10-26T07:25:21.000Z',
    });
    expect(commandState(queue.activeCommand())).toMatchObject({
      name: 'execute',
      status: 'interrupted',
    });
    expect(queue.findByKey('key-0')?.status).toBe('valid');
  });

  it('Should store the time of an interruption as SQLite does', () => {
    queue.open(file);
    queue.enqueue('execute');
    queue.markInterrupted('2026-10-26T07:25:21.123Z');
    queue.close();

    const db = new DatabaseSync(file);
    const row = db.prepare('SELECT status, finished_at FROM commands').get();
    db.close();

    expect(row).toEqual({
      status: 'interrupted',
      finished_at: '2026-10-26 07:25:21',
    });
  });
});
