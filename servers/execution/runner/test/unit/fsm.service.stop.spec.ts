import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import {
  createService,
  MACHINE_FILE,
  scriptFolder,
  names,
  settle,
  withEnv,
} from './fsm.fixture';

const DEFINITION = `
events: [go, restart, halt, reset]
states:
  create:
    transitions:
      go: execute
      restart: {state: create, stop: true}
      $stopped: terminate
  execute:
    transitions:
      halt: {state: terminate, stop: true}
      reset: {state: create, stop: true}
  terminate:
    transitions:
      reset: create
      restart: {state: create, stop: true}`;

describe('State machine service with stopped scripts', () => {
  let dir: string;

  beforeAll(() => {
    dir = scriptFolder(DEFINITION);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => createService(join(dir, MACHINE_FILE));

  it('Should follow $stopped when the script of the state is stopped', async () => {
    const { service, manager } = setup();
    service.transition('create');

    await manager.stop('create');
    await settle();

    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'terminate',
      undefined,
      withEnv,
    );
    expect(service.check()).toMatchObject({
      state: 'terminate',
      status: 'running',
    });
  });

  it('Should stay idle with status stopped without a $stopped transition', async () => {
    const { service, manager } = setup();
    service.transition('execute');

    await manager.stop();
    await settle();

    expect(manager.newCommand).toHaveBeenCalledTimes(1);
    expect(service.check()).toMatchObject({
      state: 'execute',
      status: 'stopped',
    });
  });

  it('Should enter the target of a stop transition before its script runs', async () => {
    const { service, manager } = setup();
    service.transition('execute');

    expect(service.event('halt')).toEqual({
      status: 'accepted',
      state: 'terminate',
    });
    expect(service.check()).toMatchObject({
      state: 'terminate',
      status: 'running',
    });
    expect(manager.newCommand).toHaveBeenCalledTimes(1);
    await settle();
    expect(manager.stop).toHaveBeenCalledWith('execute');
    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'terminate',
      undefined,
      withEnv,
    );
  });

  it('Should restart the script on a stop transition to the same state', async () => {
    const { service, manager } = setup();
    service.transition('create');

    expect(service.event('restart').status).toBe('accepted');
    await settle();

    // the stopped run raised no $stopped, as the machine had moved on
    expect(names(manager.newCommand.mock.calls)).toEqual(['create', 'create']);
    expect(service.check()).toMatchObject({
      state: 'create',
      status: 'running',
    });
  });

  it('Should refuse a stop transition into another state whose script runs', () => {
    const { service, manager } = setup();
    service.transition('create');
    service.event('go');

    expect(service.event('reset')).toEqual({
      status: 'script running',
      state: 'execute',
    });
    expect(manager.stop).not.toHaveBeenCalled();
  });

  it('Should run the target at once when the script has finished', async () => {
    const { service, manager, finish } = setup();
    service.transition('execute');
    await finish('execute', true);

    service.event('halt');
    await settle();

    expect(await manager.stop.mock.results[0].value).toEqual([]);
    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'terminate',
      undefined,
      withEnv,
    );
  });

  it('Should not run the target after a later entry', async () => {
    const { service, manager } = setup();
    service.transition('execute');
    service.event('halt');

    expect(service.event('reset').state).toBe('create');
    await settle();

    expect(names(manager.newCommand.mock.calls)).toEqual(['execute', 'create']);
  });

  it('Should not run a script before an earlier stop has finished', async () => {
    const { service, manager } = setup();
    let release = () => {};
    manager.stop.mockImplementationOnce(
      () =>
        new Promise<string[]>((resolve) => {
          release = () => resolve(['execute']);
        }),
    );
    service.transition('execute');
    service.event('halt');

    // terminate's script never started, so only the order of the stops
    // keeps create from running while execute still exits
    expect(service.event('restart').state).toBe('create');
    await settle();
    expect(names(manager.newCommand.mock.calls)).toEqual(['execute']);
    release();
    await settle();
    expect(names(manager.newCommand.mock.calls)).toEqual(['execute', 'create']);
  });

  it('Should not run the target once shutdown began', async () => {
    const { service, manager } = setup();
    service.transition('execute');
    service.event('halt');

    service.beforeApplicationShutdown();
    await settle();

    expect(manager.newCommand).toHaveBeenCalledTimes(1);
  });

  it('Should signal a stop transition once, and not the stopped script', async () => {
    const { service } = setup();
    service.transition('execute');
    const changed = jest.fn();
    service.onChange(changed);

    service.event('halt');
    await settle();

    expect(changed).toHaveBeenCalledTimes(1);
  });
});
