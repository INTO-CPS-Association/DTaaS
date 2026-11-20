import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ParameterValue } from 'src/dto/parameters.dto';
import Queue from 'src/queue.service';
import { NO_RESOURCES } from 'src/resources/resources';
import { commandNames } from 'test/utils';

// An ISO 8601 UTC time, as the queue returns its timestamps
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// The names of the commands of the queue, oldest first
const names = (queue: Queue) => commandNames(queue.history({ limit: 100 }));

const logs = (stdout: string, stderr = '') =>
  new Map([
    ['stdout', stdout],
    ['stderr', stderr],
  ]);

describe('check Queue service', () => {
  let queue: Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Queue],
    }).compile();

    queue = module.get<Queue>(Queue);
  });

  afterEach(() => queue.close());

  it('should return active command as undefined when queue is empty', async () => {
    expect(queue.activeCommand()).toBe(undefined);
  });

  it('should record a command as unfinished and invalid until it completes', async () => {
    queue.enqueue('hello');

    expect(queue.activeCommand()).toEqual({
      id: 1,
      name: 'hello',
      status: 'invalid',
      stdout: '',
      stderr: '',
      exitCode: null,
      resources: NO_RESOURCES,
      finished: false,
      receivedAt: expect.stringMatching(ISO_TIME),
      finishedAt: null,
    });
  });

  it('should store the result of a completed command', async () => {
    const id = queue.enqueue('hello');
    const output = logs('hello world', 'warning');
    queue.complete(id, ['success', output, 0, NO_RESOURCES]);

    expect(queue.activeCommand()).toEqual({
      id,
      name: 'hello',
      status: 'valid',
      stdout: 'hello world',
      stderr: 'warning',
      exitCode: 0,
      resources: NO_RESOURCES,
      finished: true,
      receivedAt: expect.stringMatching(ISO_TIME),
      finishedAt: expect.stringMatching(ISO_TIME),
    });
  });

  it('should convert the timestamps that SQLite wrote to ISO 8601', () => {
    (queue as unknown as { db: DatabaseSync }).db
      .prepare(
        `INSERT INTO commands (name, received_at, finished_at)
          VALUES ('hello', '2026-10-25 09:59:58', '2026-10-25 10:00:00')`,
      )
      .run();

    expect(queue.activeCommand()).toMatchObject({
      receivedAt: '2026-10-25T09:59:58.000Z',
      finishedAt: '2026-10-25T10:00:00.000Z',
    });
  });

  it('should store a failed command with its exit code', async () => {
    const id = queue.enqueue('terminate');
    queue.complete(id, ['failed', new Map(), 3, NO_RESOURCES]);

    expect(queue.activeCommand()).toMatchObject({
      status: 'failed',
      stdout: '',
      exitCode: 3,
      finished: true,
    });
  });

  it('should store a stopped command as stopped', async () => {
    const id = queue.enqueue('loop');
    queue.complete(id, ['stopped', new Map(), null, NO_RESOURCES]);

    expect(queue.activeCommand()).toMatchObject({
      status: 'stopped',
      finished: true,
    });
  });

  it('should signal a command that starts and one that finishes', () => {
    const changed = jest.fn();
    queue.onChange(changed);

    const id = queue.enqueue('hello', 'key-1');
    expect(changed).toHaveBeenCalledTimes(1);
    queue.complete(id, ['success', logs('hello world'), 0, NO_RESOURCES]);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('should return correct active command when queue has more than one command', async () => {
    queue.enqueue('hello');
    queue.enqueue('world');

    expect(queue.activeCommand()?.name).toBe('world');
  });

  it('should find a command by its request key', async () => {
    queue.enqueue('hello');
    const id = queue.enqueue('world', 'key-1');

    expect(queue.findByKey('key-1')).toMatchObject({ id, name: 'world' });
    expect(queue.findByKey('key-2')).toBeUndefined();
  });

  it('should find a command by each of its request keys', async () => {
    const id = queue.enqueue('world', 'key-1');
    queue.addKey('key-2', id);

    expect(queue.findByKey('key-2')).toMatchObject({ id, name: 'world' });
    expect(names(queue)).toStrictEqual(['world']);
  });

  it('should create the directory of the database file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'runner-'));
    try {
      queue.open(join(dir, 'data', 'runner.db'));
      queue.enqueue('hello');
      expect(names(queue)).toStrictEqual(['hello']);
      expect(queue.mode()).toBe('file');
    } finally {
      queue.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should close only once', async () => {
    queue.close();
    expect(() => queue.close()).not.toThrow();
  });

  it('should stay in memory without a database file', async () => {
    queue.enqueue('hello');
    queue.open(undefined);

    expect(names(queue)).toStrictEqual(['hello']);
    expect(queue.mode()).toBe('memory');
  });

  it('should keep the commands in a database file across restarts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'runner-'));
    const file = join(dir, 'runner.db');
    try {
      queue.open(file);
      const id = queue.enqueue('hello', 'key-1');
      queue.complete(id, ['success', logs('hello world'), 0, NO_RESOURCES]);
      queue.close();

      const restarted = new Queue();
      restarted.open(file);
      expect(names(restarted)).toStrictEqual(['hello']);
      expect(restarted.findByKey('key-1')).toMatchObject({ finished: true });
      restarted.close();
      queue = new Queue();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should have no parameter values before the first change', () => {
    expect(queue.parameterValues()).toEqual({});
  });

  it('should return the latest value of each parameter', () => {
    queue.setParameters(
      new Map<string, ParameterValue>([
        ['scope', 'single'],
        ['capacity', 20],
      ]),
    );
    queue.setParameters(
      new Map<string, ParameterValue>([
        ['scope', 'multi'],
        ['enabled', false],
      ]),
    );

    expect(queue.parameterValues()).toEqual({
      scope: 'multi',
      capacity: 20,
      enabled: false,
    });
  });

  it('should record each change of a parameter with an ISO timestamp', () => {
    queue.setParameters(new Map([['scope', 'multi']]));
    queue.setParameters(new Map([['scope', 'single']]));

    const rows = (queue as unknown as { db: DatabaseSync }).db
      .prepare('SELECT name, value, changed_at FROM parameters ORDER BY id')
      .all();
    expect(rows.map(({ value }) => value)).toEqual(['"multi"', '"single"']);
    rows.forEach(({ changed_at: changedAt }) =>
      expect(new Date(String(changedAt)).toISOString()).toBe(changedAt),
    );
  });

  it('should keep none of the changes of a request when one fails', () => {
    // undefined can not be stored, so the second insert fails
    const changes = new Map([
      ['scope', 'multi'],
      ['capacity', undefined],
    ]) as unknown as Map<string, ParameterValue>;

    expect(() => queue.setParameters(changes)).toThrow();
    expect(queue.parameterValues()).toEqual({});
  });
});
