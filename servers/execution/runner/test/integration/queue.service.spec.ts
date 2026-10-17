import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Queue from 'src/queue.service';

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

  afterEach(() => queue.onApplicationShutdown());

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
      finished: false,
    });
  });

  it('should store the result of a completed command', async () => {
    const id = queue.enqueue('hello');
    queue.complete(id, [true, logs('hello world', 'warning')]);

    expect(queue.activeCommand()).toEqual({
      id,
      name: 'hello',
      status: 'valid',
      stdout: 'hello world',
      stderr: 'warning',
      finished: true,
    });
  });

  it('should store a failed command with empty logs', async () => {
    const id = queue.enqueue('terminate');
    queue.complete(id, [false, new Map()]);

    expect(queue.activeCommand()).toMatchObject({
      status: 'invalid',
      stdout: '',
      stderr: '',
      finished: true,
    });
  });

  it('should return correct active command when queue has more than one command', async () => {
    queue.enqueue('hello');
    queue.enqueue('world');

    expect(queue.activeCommand()?.name).toBe('world');
  });

  it('should return empty array when queue is empty', async () => {
    expect(queue.checkHistory()).toStrictEqual([]);
  });

  it('should return correct command history when queue has more than one command', async () => {
    const names = ['hello', 'world', 'terminate'];
    names.forEach((name) => queue.enqueue(name));
    expect(queue.checkHistory()).toStrictEqual(names.map((name) => ({ name })));
  });

  it('should find a command by its request key', async () => {
    queue.enqueue('hello');
    const id = queue.enqueue('world', 'key-1');

    expect(queue.findByKey('key-1')).toMatchObject({ id, name: 'world' });
    expect(queue.findByKey('key-2')).toBeUndefined();
  });

  it('should keep the commands in a database file across restarts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'runner-'));
    const file = join(dir, 'runner.db');
    try {
      queue.open(file);
      const id = queue.enqueue('hello', 'key-1');
      queue.complete(id, [true, logs('hello world')]);
      queue.onApplicationShutdown();

      const restarted = new Queue();
      restarted.open(file);
      expect(restarted.checkHistory()).toStrictEqual([{ name: 'hello' }]);
      expect(restarted.findByKey('key-1')).toMatchObject({ finished: true });
      restarted.onApplicationShutdown();
      queue = new Queue();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
