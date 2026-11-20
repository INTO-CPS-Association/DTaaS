import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { createService, MACHINE_FILE, scriptFolder } from './fsm.fixture';

describe('State machine service requests', () => {
  let dir: string;

  beforeAll(() => {
    dir = scriptFolder();
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => createService(join(dir, MACHINE_FILE));

  it('Should answer that there is no state machine without a file', () => {
    const { service } = createService(undefined);

    expect(service.transition('create')).toEqual({
      status: 'no state machine',
      state: null,
    });
    expect(service.event('stop')).toEqual({
      status: 'no state machine',
      state: null,
    });
    expect(service.check()).toBeUndefined();
  });

  it('Should stop accepting requests on shutdown', async () => {
    const { service, manager, finish } = setup();
    service.transition('create');

    service.beforeApplicationShutdown();
    await finish('create', true);

    expect(manager.newCommand).toHaveBeenCalledTimes(1);
    expect(service.event('stop').status).toBe('stopping');
    expect(service.transition('create').status).toBe('stopping');
  });

  describe('repeated requests', () => {
    it('Should give a repeated request the first reply', () => {
      const { service, manager } = setup();

      const first = service.transition('execute', 'key-1');
      const repeat = service.transition('execute', 'key-1');

      expect(repeat).toEqual(first);
      expect(repeat.status).toBe('accepted');
      expect(manager.newCommand).toHaveBeenCalledTimes(1);
    });

    it('Should refuse a request key of another request', () => {
      const { service } = setup();
      service.transition('execute', 'key-1');

      expect(service.event('stop', 'key-1')).toEqual({
        status: 'invalid request key',
        state: 'execute',
      });
    });

    it('Should check a refused request again when it is repeated', async () => {
      const { service, finish } = setup();
      service.transition('execute');

      expect(service.event('stop', 'key-1').status).toBe('accepted');
      expect(service.transition('create', 'key-2').status).toBe('busy');
      await finish('terminate', true);
      expect(service.transition('create', 'key-2').status).toBe('accepted');
    });

    it('Should treat an empty request key as no key', () => {
      const { service } = setup();
      service.transition('execute', '');

      expect(service.transition('execute', '').status).toBe('busy');
    });
  });

  describe('answers', () => {
    // A parameter whose change raises the event stop
    const WITH_PARAMETER = `
events: [stop, reset]
parameters:
  scope: {type: enum, values: [single, multi], default: single, controllable: true, event: stop}
states:
  create: {transitions: {$success: execute}}
  execute: {transitions: {stop: create}}`;

    const listen = (file = join(dir, MACHINE_FILE)) => {
      const created = createService(file);
      const answered = jest.fn();
      created.service.onAnswer(answered);
      return { ...created, answered };
    };

    it('Should signal each computed reply with its request', () => {
      const { service, answered } = listen();

      service.transition('create');
      service.event('stop');

      expect(answered.mock.calls).toEqual([
        [
          { kind: 'transition', name: 'create' },
          { status: 'accepted', state: 'create' },
        ],
        [
          { kind: 'event', name: 'stop' },
          { status: 'no transition', state: 'create' },
        ],
      ]);
    });

    it('Should not signal a repeat or a request key of another request', () => {
      const { service, answered } = listen();
      service.transition('execute', 'key-1');

      service.transition('execute', 'key-1');
      service.event('stop', 'key-1');

      expect(answered).toHaveBeenCalledTimes(1);
    });

    it('Should signal the events that a parameter change raises', () => {
      const other = scriptFolder(WITH_PARAMETER);
      try {
        const { service, answered } = listen(join(other, MACHINE_FILE));
        service.transition('execute');

        service.setParameters({ scope: 'multi' });

        expect(answered).toHaveBeenLastCalledWith(
          { kind: 'event', name: 'stop' },
          { status: 'accepted', state: 'create' },
        );
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    });
  });
});
