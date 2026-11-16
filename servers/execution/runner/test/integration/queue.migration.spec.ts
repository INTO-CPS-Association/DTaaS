import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Queue from 'src/queue.service';
import { NO_RESOURCES } from 'src/resources/resources';

// The commands table of version 0.6.0, which has no exit_code column
const OLD_SCHEMA = `
  CREATE TABLE commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invalid',
    stdout TEXT NOT NULL DEFAULT '',
    stderr TEXT NOT NULL DEFAULT '',
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT
  );
  INSERT INTO commands (name, finished_at)
    VALUES ('create', CURRENT_TIMESTAMP);`;

// The commands table of 0.10.0, before issue 17a, without resources
const SCHEMA_0_10 = `
  CREATE TABLE commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invalid',
    stdout TEXT NOT NULL DEFAULT '',
    stderr TEXT NOT NULL DEFAULT '',
    exit_code INTEGER,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT,
    by TEXT
  );
  INSERT INTO commands (name, status, exit_code, finished_at)
    VALUES ('create', 'valid', 0, CURRENT_TIMESTAMP);`;

// The commands table of 0.10.0 after issue 17a, without processes
const SCHEMA_17A = `
  CREATE TABLE commands (
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
    peak_rss_bytes INTEGER
  );
  INSERT INTO commands (name, status, finished_at, cpu_seconds, peak_rss_bytes)
    VALUES ('create', 'valid', CURRENT_TIMESTAMP, 0.469, 115646464);`;

// A database file of 0.6.0, or of the schema given, with one finished
// command
function oldDatabase(dir: string, schema = OLD_SCHEMA): string {
  const file = join(dir, 'runner.db');
  const old = new DatabaseSync(file);
  old.exec(schema);
  old.close();
  return file;
}

// The number of columns of the commands table with the name
const columnCount = (file: string, column: string): number => {
  const db = new DatabaseSync(file);
  const columns = db.prepare('PRAGMA table_info(commands)').all();
  db.close();
  return columns.filter(({ name }) => name === column).length;
};

// The caller stored with each command, by id
const callers = (file: string): unknown[] => {
  const db = new DatabaseSync(file);
  const rows = db.prepare('SELECT by FROM commands ORDER BY id').all();
  db.close();
  return rows.map(({ by }) => by);
};

describe('Queue exit codes and statuses', () => {
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

  it('should add the exit code column to a database of 0.6.0 once', () => {
    const file = oldDatabase(dir);

    queue.open(file);
    const id = queue.enqueue('create');
    queue.complete(id, ['failed', new Map(), 3, NO_RESOURCES]);
    queue.close();
    queue = new Queue();
    queue.open(file);

    expect(queue.activeCommand()).toMatchObject({ id, exitCode: 3 });
    queue.close();
    expect(columnCount(file, 'exit_code')).toBe(1);
  });

  it('should add the by column to a database of 0.6.0 once', () => {
    const file = oldDatabase(dir);

    queue.open(file);
    queue.enqueue('create', undefined, 'alice');
    queue.close();
    queue = new Queue();
    queue.open(file);
    queue.close();

    expect(columnCount(file, 'by')).toBe(1);
    expect(callers(file)).toEqual([null, 'alice']);
  });

  it('should add the resource columns to a database of 0.10.0 once', () => {
    const file = oldDatabase(dir, SCHEMA_0_10);
    const figures = {
      cpuSeconds: 0.469,
      peakRssBytes: 115646464,
      processes: 2,
    };

    queue.open(file);
    expect(queue.activeCommand()?.resources).toEqual(NO_RESOURCES);
    queue.complete(queue.enqueue('create'), ['success', new Map(), 0, figures]);
    queue.close();
    queue = new Queue();
    queue.open(file);

    const records = queue.history({ limit: 2 });
    expect(records.map(({ resources }) => resources)).toEqual([
      NO_RESOURCES,
      figures,
    ]);
    queue.close();
    expect(columnCount(file, 'cpu_seconds')).toBe(1);
    expect(columnCount(file, 'peak_rss_bytes')).toBe(1);
    expect(columnCount(file, 'processes')).toBe(1);
  });

  it('should add the processes column to a database of 17a once', () => {
    const file = oldDatabase(dir, SCHEMA_17A);

    queue.open(file);
    queue.close();
    queue = new Queue();
    queue.open(file);

    expect(queue.activeCommand()?.resources).toEqual({
      cpuSeconds: 0.469,
      peakRssBytes: 115646464,
      processes: null,
    });
    queue.close();
    expect(columnCount(file, 'processes')).toBe(1);
  });

  it('should store the caller of a command, NULL without one', () => {
    const file = join(dir, 'runner.db');
    queue.open(file);

    queue.enqueue('create', 'key-1', 'manager-1');
    queue.enqueue('create', undefined, 'script');
    queue.enqueue('create');
    queue.close();

    expect(callers(file)).toEqual(['manager-1', 'script', null]);
  });

  it('should have no exit code for a command of 0.6.0', () => {
    const file = oldDatabase(dir);

    queue.open(file);

    expect(queue.activeCommand()).toMatchObject({
      name: 'create',
      status: 'invalid',
      exitCode: null,
      finished: true,
    });
  });

  it('should finish a refused command as invalid and signal it', () => {
    const changed = jest.fn();
    queue.onChange(changed);
    const id = queue.enqueue('configure');

    queue.refuse(id);

    expect(queue.activeCommand()).toMatchObject({
      status: 'invalid',
      exitCode: null,
      finished: true,
    });
    expect(changed).toHaveBeenCalledTimes(2);
  });
});
