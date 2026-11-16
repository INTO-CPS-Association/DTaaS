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

describe('State machine service', () => {
  let dir: string;

  beforeAll(() => {
    dir = scriptFolder();
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => createService(join(dir, MACHINE_FILE));

  it('Should stop at startup when the file does not exist', () => {
    const file = join(dir, 'missing.yaml');

    expect(() => createService(file)).toThrow(
      `State machine file ${file} does not exist or is not a file`,
    );
  });

  it('Should report a machine that has not started', () => {
    const { service } = setup();

    expect(service.check()).toEqual({
      state: null,
      status: 'none',
      entry: 0,
      events: ['reset', 'stop'],
    });
  });

  it('Should enter the requested state and run its script', () => {
    const { service, manager } = setup();

    expect(service.transition('create')).toEqual({
      status: 'accepted',
      state: 'create',
    });
    // synchronously, so that the manager knows the script runs
    expect(manager.newCommand).toHaveBeenCalledWith('create', undefined, {
      env: expect.objectContaining({ DT_STATE: 'create', DT_ENTRY: '1' }),
    });
    expect(service.check()).toMatchObject({ status: 'running', entry: 1 });
  });

  it('Should refuse an undeclared state', () => {
    const { service, manager } = setup();

    expect(service.transition('configure').status).toBe('invalid state');
    expect(manager.newCommand).not.toHaveBeenCalled();
  });

  it('Should refuse a transition request while the script runs', () => {
    const { service } = setup();
    service.transition('execute');

    expect(service.transition('create')).toEqual({
      status: 'busy',
      state: 'execute',
    });
  });

  it('Should accept a transition request once the script finished', async () => {
    const { service, finish } = setup();
    service.transition('execute');
    await finish('execute', true);

    expect(service.check()?.status).toBe('valid');
    expect(service.transition('create').status).toBe('accepted');
  });

  it('Should move on when the script succeeds', async () => {
    const { service, manager, finish } = setup();
    service.transition('create');
    await finish('create', true);

    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'execute',
      undefined,
      withEnv,
    );
    expect(service.check()).toMatchObject({
      state: 'execute',
      status: 'running',
    });
  });

  it('Should move on when the script fails', async () => {
    const { service, manager, finish } = setup();
    service.transition('create');
    await finish('create', false);

    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'terminate',
      undefined,
      withEnv,
    );
  });

  it('Should stay in a state without a completion transition', async () => {
    const { service, finish } = setup();
    service.transition('terminate');
    await finish('terminate', false);

    expect(service.check()).toMatchObject({
      state: 'terminate',
      status: 'invalid',
    });
  });

  it('Should follow an event while the script runs', () => {
    const { service, manager } = setup();
    service.transition('execute');

    expect(service.event('stop')).toEqual({
      status: 'accepted',
      state: 'terminate',
    });
    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'terminate',
      undefined,
      withEnv,
    );
  });

  it('Should ignore the completion of a state it left', async () => {
    const { service, manager, finish } = setup();
    service.transition('execute');
    service.event('stop');
    await finish('execute', true);

    expect(manager.newCommand).toHaveBeenCalledTimes(2);
    expect(service.check()).toMatchObject({
      state: 'terminate',
      status: 'running',
    });
  });

  it('Should refuse an undeclared event', () => {
    const { service } = setup();

    expect(service.event('$success').status).toBe('invalid event');
    expect(service.event('start').status).toBe('invalid event');
  });

  it('Should refuse an event without a transition', () => {
    const { service } = setup();

    expect(service.event('stop')).toEqual({
      status: 'no transition',
      state: null,
    });
    service.transition('create');
    expect(service.event('stop').status).toBe('no transition');
  });

  it('Should not enter a state whose script is still running', async () => {
    const { service, manager, finish } = setup();
    service.transition('execute');
    service.event('stop');
    await finish('terminate', true);

    expect(service.event('reset').status).toBe('accepted');
    await finish('create', true);

    expect(manager.newCommand).toHaveBeenCalledTimes(3);
    expect(service.check()).toMatchObject({
      state: 'create',
      status: 'valid',
    });
    expect(service.transition('execute')).toEqual({
      status: 'script running',
      state: 'create',
    });
  });

  it('Should treat a script that could not start as failed', async () => {
    const { service, manager } = setup();
    manager.newCommand.mockRejectedValueOnce(new Error('database closed'));
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    service.transition('create');
    await settle();

    expect(manager.newCommand).toHaveBeenLastCalledWith(
      'terminate',
      undefined,
      withEnv,
    );
  });

  it('Should signal each entry and each completion once', async () => {
    const { service, finish } = setup();
    const changed = jest.fn();
    service.onChange(changed);

    service.transition('create');
    expect(changed).toHaveBeenCalledTimes(1);
    // the completion of create, and the entry into execute
    await finish('create', true);
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it('Should signal no refused request', () => {
    const { service } = setup();
    service.transition('execute');
    const changed = jest.fn();
    service.onChange(changed);

    service.transition('configure');
    service.transition('create');
    service.event('reset');
    service.event('start');

    expect(changed).not.toHaveBeenCalled();
  });
});
