import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import {
  createService,
  MACHINE_FILE,
  scriptFolder,
  settle,
  withEnv,
} from './fsm.fixture';

const DEFINITION = `
events: [restart, scope-changed]
parameters:
  scope: {type: enum, values: [single, multi], default: single, controllable: true, event: scope-changed}
  mode: {type: string, default: a, controllable: true, event: scope-changed}
  label: {type: string, default: x, controllable: true, event: restart}
  capacity: {type: number, default: 20}
states:
  create: {transitions: {$success: execute, restart: create}}
  execute:
    transitions:
      restart: create
      scope-changed: {state: execute, stop: true}`;

describe('State machine service parameters', () => {
  let dir: string;

  beforeAll(() => {
    dir = scriptFolder(DEFINITION);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => {
    const created = createService(join(dir, MACHINE_FILE));
    const logger = created.service['logger'];
    const debug = jest.spyOn(logger, 'debug').mockReturnValue(undefined);
    const warn = jest.spyOn(logger, 'warn').mockReturnValue(undefined);
    return { ...created, debug, warn };
  };

  it('Should have nothing to set without a state machine', () => {
    const { service, queue } = createService(undefined);

    expect(service.parameters()).toBeUndefined();
    expect(service.setParameters({ scope: 'multi' })).toEqual([]);
    expect(queue.setParameters).not.toHaveBeenCalled();
  });

  it('Should refuse a body with a problem and change nothing', () => {
    const { service, queue, manager } = setup();
    service.transition('execute');

    expect(service.setParameters({ scope: 'multi', capacity: 30 })).toEqual([
      'parameter capacity is not controllable',
    ]);
    expect(queue.setParameters).not.toHaveBeenCalled();
    expect(service.parameters()?.values().scope).toBe('single');
    expect(manager.stop).not.toHaveBeenCalled();
  });

  it('Should signal the new values before their events move the machine', () => {
    const { service, manager } = setup();
    service.transition('execute');
    const states: Array<unknown> = [];
    service.onChange(() =>
      states.push([
        service.parameters()?.values().scope,
        manager.stop.mock.calls.length,
      ]),
    );

    service.setParameters({ scope: 'multi' });

    expect(states[0]).toEqual(['multi', 0]);
  });

  it('Should store the values before it raises their events', async () => {
    const { service, queue, manager } = setup();
    service.transition('execute');

    expect(service.setParameters({ scope: 'multi' })).toEqual([]);
    await settle();

    expect(queue.setParameters).toHaveBeenCalledWith(
      new Map([['scope', 'multi']]),
    );
    expect(service.parameters()?.values().scope).toBe('multi');
    const [stored] = queue.setParameters.mock.invocationCallOrder;
    const [stopped] = manager.stop.mock.invocationCallOrder;
    expect(stored).toBeLessThan(stopped);
    expect(manager.newCommand).toHaveBeenCalledTimes(2);
    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'execute',
      undefined,
      withEnv,
    );
  });

  it('Should raise an event that two changes declare once', async () => {
    const { service, manager } = setup();
    service.transition('execute');

    service.setParameters({ scope: 'multi', mode: 'b' });
    await settle();

    expect(manager.stop).toHaveBeenCalledTimes(1);
    expect(manager.newCommand).toHaveBeenCalledTimes(2);
  });

  it('Should raise the events in declaration order, each from the state the last one left', async () => {
    const { service, manager } = setup();
    service.transition('execute');

    service.setParameters({ label: 'y', scope: 'multi' });
    await settle();

    expect(manager.stop).toHaveBeenCalledWith('execute');
    expect(service.check()?.state).toBe('create');
  });

  it('Should raise no event for a value equal to the current one', () => {
    const { service, queue, manager } = setup();
    service.transition('execute');

    expect(service.setParameters({ scope: 'single' })).toEqual([]);
    const stored = queue.setParameters.mock.calls.flatMap(([changes]) => [
      ...(changes as Map<string, unknown>),
    ]);
    expect(stored).toEqual([]);
    expect(manager.stop).not.toHaveBeenCalled();
  });

  it('Should log an event without a transition at debug level', () => {
    const { service, debug, warn } = setup();

    expect(service.setParameters({ scope: 'multi' })).toEqual([]);

    expect(service.parameters()?.values().scope).toBe('multi');
    expect(debug).toHaveBeenCalledWith(
      'Stayed in state null on scope-changed: no transition',
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('Should warn of an event refused while the script runs', () => {
    const { service, warn } = setup();
    service.transition('create');

    expect(service.setParameters({ label: 'y' })).toEqual([]);

    expect(warn).toHaveBeenCalledWith(
      'Stayed in state create on restart: script running',
    );
  });

  it('Should warn of an event refused on shutdown', () => {
    const { service, warn } = setup();
    service.transition('execute');
    service.beforeApplicationShutdown();

    service.setParameters({ scope: 'multi' });

    expect(warn).toHaveBeenCalledWith(
      'Stayed in state execute on scope-changed: stopping',
    );
  });

  it('Should change nothing when the database fails', () => {
    const { service, queue, manager } = setup();
    service.transition('execute');
    queue.setParameters.mockImplementationOnce(() => {
      throw new Error('database closed');
    });

    expect(() => service.setParameters({ scope: 'multi' })).toThrow(
      'database closed',
    );
    expect(service.parameters()?.values().scope).toBe('single');
    expect(manager.stop).not.toHaveBeenCalled();
  });
});
