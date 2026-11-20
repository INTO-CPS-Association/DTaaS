import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import {
  createService,
  MACHINE_FILE,
  names,
  scriptFolder,
  settle,
} from './fsm.fixture';

const DEFINITION = `
events: [halt, reset]
states:
  create: {transitions: {$success: execute}}
  execute: {transitions: {halt: {state: terminate, stop: true}}}
  terminate: {transitions: {reset: create}}`;

const KILLED = { state: 'execute', entry: 3, status: 'running' } as const;

describe('State machine service across restarts', () => {
  let dir: string;

  beforeAll(() => {
    dir = scriptFolder(DEFINITION);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => createService(join(dir, MACHINE_FILE));

  // A service restored from the row of a runner killed in execute
  const restored = () => {
    const created = setup();
    created.queue.loadMachine.mockReturnValue(KILLED);
    created.service.restore();
    return created;
  };

  it('Should describe the restored machine', () => {
    const { service, queue } = restored();

    expect(service.check()).toEqual({
      state: 'execute',
      status: 'interrupted',
      entry: 3,
      events: ['halt', 'reset'],
    });
    expect(queue.markInterrupted).toHaveBeenCalled();
    expect(queue.saveMachine).toHaveBeenCalledWith({
      ...KILLED,
      status: 'interrupted',
    });
  });

  it('Should mark the commands interrupted without a state machine', () => {
    const { service, queue } = createService(undefined);
    queue.loadMachine.mockReturnValue(KILLED);

    service.restore();

    expect(service.check()).toBeUndefined();
    expect(queue.markInterrupted).toHaveBeenCalled();
    expect(queue.saveMachine).not.toHaveBeenCalled();
  });

  it('Should accept a transition from an interrupted state', () => {
    const { service, manager } = restored();

    expect(service.transition('create')).toEqual({
      status: 'accepted',
      state: 'create',
    });
    expect(service.check()).toMatchObject({ state: 'create', entry: 4 });
    expect(names(manager.newCommand.mock.calls)).toEqual(['create']);
  });

  it('Should follow an event from an interrupted state', async () => {
    const { service, manager } = restored();

    expect(service.event('halt').state).toBe('terminate');
    await settle();

    expect(manager.stop).toHaveBeenCalledWith('execute');
    expect(names(manager.newCommand.mock.calls)).toEqual(['terminate']);
  });

  it('Should store each entry and the status its script leaves', async () => {
    const { service, queue, finish } = setup();

    service.transition('create');
    await finish('create', true);
    service.event('halt');

    expect(queue.saveMachine.mock.calls.map(([row]) => row)).toEqual([
      { state: 'create', entry: 1, status: 'running' },
      { state: 'create', entry: 1, status: 'valid' },
      { state: 'execute', entry: 2, status: 'running' },
      { state: 'terminate', entry: 3, status: 'running' },
    ]);
  });

  it('Should accept a transition when the machine cannot be stored', () => {
    const { service, queue } = setup();
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockReturnValue(undefined);
    queue.saveMachine.mockImplementation(() => {
      throw new Error('database is not open');
    });

    expect(service.transition('create').status).toBe('accepted');
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('database is not open'),
    );
    error.mockRestore();
  });

  it('Should store the status of a script that finishes during shutdown', async () => {
    const { service, queue, manager, finish } = setup();
    service.transition('create');

    service.beforeApplicationShutdown();
    await finish('create', true);

    expect(queue.saveMachine).toHaveBeenLastCalledWith({
      state: 'create',
      entry: 1,
      status: 'valid',
    });
    expect(names(manager.newCommand.mock.calls)).toEqual(['create']);
    expect(service.check()).toMatchObject({ state: 'create', status: 'valid' });
  });
});
