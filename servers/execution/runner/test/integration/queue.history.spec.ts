import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Queue from 'src/queue.service';
import { NO_RESOURCES } from 'src/resources/resources';
import { SCHEMA } from 'src/queue.schema';

// Four commands with known times, the last one unfinished; the first
// has resource figures
const ROWS = `
  INSERT INTO commands
    (name, status, exit_code, received_at, finished_at, by) VALUES
    ('admit', 'valid', 0, '2026-10-26 14:55:51', '2026-10-26 14:55:52', 'alice'),
    ('admit', 'failed', 3, '2026-10-26 14:55:59', '2026-10-26 14:56:00', NULL),
    ('discharge', 'valid', 0, '2026-10-26 14:56:00', '2026-10-26 14:56:01',
      'manager-1'),
    ('open', 'invalid', NULL, '2026-10-26 14:56:17', NULL, NULL);
  UPDATE commands SET cpu_seconds = 0.469, peak_rss_bytes = 115646464,
    processes = 2 WHERE id = 1;`;

const FIGURES = { cpuSeconds: 0.469, peakRssBytes: 115646464, processes: 2 };

const RECORDS = [
  {
    id: 1,
    name: 'admit',
    status: 'valid',
    exitCode: 0,
    receivedAt: '2026-10-26T14:55:51.000Z',
    finishedAt: '2026-10-26T14:55:52.000Z',
    by: 'alice',
    resources: FIGURES,
  },
  {
    id: 2,
    name: 'admit',
    status: 'failed',
    exitCode: 3,
    receivedAt: '2026-10-26T14:55:59.000Z',
    finishedAt: '2026-10-26T14:56:00.000Z',
    by: null,
    resources: NO_RESOURCES,
  },
  {
    id: 3,
    name: 'discharge',
    status: 'valid',
    exitCode: 0,
    receivedAt: '2026-10-26T14:56:00.000Z',
    finishedAt: '2026-10-26T14:56:01.000Z',
    by: 'manager-1',
    resources: NO_RESOURCES,
  },
  {
    id: 4,
    name: 'open',
    status: 'running',
    exitCode: null,
    receivedAt: '2026-10-26T14:56:17.000Z',
    finishedAt: null,
    by: null,
    resources: NO_RESOURCES,
  },
];

// A database file of the current version, with the rows given
function database(dir: string, sql: string): string {
  const file = join(dir, 'runner.db');
  const db = new DatabaseSync(file);
  db.exec(sql);
  db.close();
  return file;
}

const ids = (records: { id: number }[]) => records.map(({ id }) => id);

describe('Queue history', () => {
  let dir: string;
  let queue: Queue;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-'));
    queue = new Queue();
    queue.open(database(dir, `${SCHEMA}; ${ROWS}`));
  });

  afterEach(() => {
    queue.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns every field, oldest first, running while unfinished', () => {
    expect(queue.history({ limit: 100 })).toStrictEqual(RECORDS);
  });

  // the schema refuses such a time; the query must not fail open
  it('returns no record for a time that SQLite can not read', () => {
    expect(queue.history({ since: 'yesterday', limit: 100 })).toEqual([]);
  });

  it.each([
    '2026-10-26T14:56:00Z',
    '2026-10-26T14:56:00.900Z',
    '2026-10-26T16:56:00+02:00',
  ])('returns the records received since %s, to the second', (since) => {
    expect(ids(queue.history({ since, limit: 100 }))).toEqual([3, 4]);
  });

  it('returns the newest records within the limit, oldest first', () => {
    expect(ids(queue.history({ limit: 2 }))).toEqual([3, 4]);
    const since = '2026-10-26T14:55:52Z';
    expect(ids(queue.history({ since, limit: 2 }))).toEqual([3, 4]);
    expect(ids(queue.history({ since, limit: 3 }))).toEqual([2, 3, 4]);
  });

  it('returns the caller of a new command', () => {
    queue.enqueue('admit', undefined, 'alice');

    expect(queue.history({ limit: 1 })).toEqual([
      expect.objectContaining({ id: 5, status: 'running', by: 'alice' }),
    ]);
  });

  it('counts every status above the rows of the start, and the marked', () => {
    queue.markInterrupted('2026-10-26T14:57:00Z');
    queue.complete(queue.enqueue('admit'), [
      'success',
      new Map(),
      0,
      NO_RESOURCES,
    ]);
    queue.refuse(queue.enqueue('configure'));
    queue.enqueue('open');

    expect(queue.commandCounts()).toStrictEqual({
      valid: 1,
      failed: 0,
      stopped: 0,
      invalid: 1,
      interrupted: 1,
      running: 1,
    });
  });
});

describe('Queue history of an old or new database', () => {
  let dir: string;
  let queue: Queue;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-'));
    queue = new Queue();
  });

  afterEach(() => {
    queue.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('has no caller for a command of a database of 0.6.0', () => {
    const old = `CREATE TABLE commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'invalid',
      stdout TEXT NOT NULL DEFAULT '',
      stderr TEXT NOT NULL DEFAULT '',
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT);
      INSERT INTO commands (name, finished_at)
        VALUES ('create', CURRENT_TIMESTAMP);`;
    queue.open(database(dir, old));

    expect(queue.history({ limit: 100 })).toEqual([
      expect.objectContaining({
        name: 'create',
        status: 'invalid',
        exitCode: null,
        by: null,
      }),
    ]);
  });

  it('lists the commands in the order received, all of them running', () => {
    const commands = ['hello', 'world', 'terminate'];
    commands.forEach((name) => queue.enqueue(name));

    const history = queue.history({ limit: 100 });

    expect(history.map(({ name }) => name)).toEqual(commands);
    expect(history.map(({ status }) => status)).toEqual(
      Array(3).fill('running'),
    );
  });

  it('is empty, and counts zero for each status, without commands', () => {
    queue.markInterrupted(new Date().toISOString());

    expect(queue.history({ limit: 100 })).toStrictEqual([]);
    expect(Object.values(queue.commandCounts())).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
