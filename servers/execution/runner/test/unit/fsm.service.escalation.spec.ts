import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import { EscalationData } from 'src/dto/escalation.dto';
import {
  createService,
  MACHINE_FILE,
  scriptFolder,
  settle,
} from './fsm.fixture';

const STATES = `
events: [go, halt, tune]
parameters:
  label: {type: string, default: x, controllable: true, event: tune}
states:
  create:
    transitions:
      $failure: terminate
  execute:
    transitions:
      halt: {state: terminate, stop: true}
  terminate:
    transitions:
      go: create
`;

const ESCALATION = `escalation:
  onFailure: true
  onNoTransition: true
`;

describe('State machine service escalations', () => {
  let dirs: { on: string; off: string };

  beforeAll(() => {
    dirs = {
      on: scriptFolder(`${STATES}${ESCALATION}`),
      off: scriptFolder(STATES),
    };
  });

  afterAll(() =>
    Object.values(dirs).forEach((dir) =>
      rmSync(dir, { recursive: true, force: true }),
    ),
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The service and a listener of its escalations; the refused
  // completions and raised events log, which the tests silence
  const setup = (flags: 'on' | 'off' = 'on') => {
    jest.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    jest.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
    const created = createService(join(dirs[flags], MACHINE_FILE));
    const listener = jest.fn((_data: EscalationData) => undefined);
    created.service.onEscalation(listener);
    return { ...created, listener };
  };

  it('Should escalate a failure without a transition', async () => {
    const { service, finish, listener } = setup();
    service.transition('execute');

    await finish('execute', false);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      trigger: 'failure',
      state: 'execute',
      entry: 1,
      event: null,
      reason: 'script of state execute failed',
      proposal: null,
    });
  });

  it('Should not escalate a failure whose transition is refused', async () => {
    const { service, finish, listener } = setup();
    service.transition('terminate');
    service.event('go');

    await finish('create', false);

    expect(service.check()?.state).toBe('create');
    expect(listener).not.toHaveBeenCalled();
  });

  it('Should not escalate a stopped script', async () => {
    const { service, manager, listener } = setup();
    service.transition('execute');

    await manager.stop('execute');
    await settle();

    expect(service.check()?.status).toBe('stopped');
    expect(listener).not.toHaveBeenCalled();
  });

  it('Should escalate a repeated client event once per entry', async () => {
    const { service, finish, listener } = setup();
    service.transition('execute');

    expect(service.event('go').status).toBe('no transition');
    expect(service.event('go', 'key-1').status).toBe('no transition');
    expect(service.event('go', 'key-1').status).toBe('no transition');
    await finish('execute', true);
    service.transition('execute');
    service.event('go');

    expect(listener.mock.calls.map(([data]) => data.entry)).toEqual([1, 2]);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'no-transition', event: 'go' }),
    );
  });

  it('Should not escalate an event that is invalid or refused', () => {
    const { service, listener } = setup();
    service.transition('execute');

    expect(service.event('unknown').status).toBe('invalid event');
    service.beforeApplicationShutdown();
    expect(service.event('go').status).toBe('stopping');
    expect(listener).not.toHaveBeenCalled();
  });

  it('Should not escalate an event that a parameter raises', () => {
    const { service, listener } = setup();
    service.transition('execute');

    expect(service.setParameters({ label: 'y' })).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('Should escalate nothing by itself with the flags off', async () => {
    const { service, finish, listener } = setup('off');
    service.transition('execute');

    service.event('go');
    await finish('execute', false);

    expect(service.check()?.status).toBe('invalid');
    expect(listener).not.toHaveBeenCalled();
  });

  it('Should escalate a request without a state machine', () => {
    const { service } = createService(undefined);
    const listener = jest.fn((_data: EscalationData) => undefined);
    service.onEscalation(listener);

    expect(service.escalate({ reason: 'capacity' })).toEqual({
      status: 'accepted',
    });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'request', state: null, entry: 0 }),
    );
  });

  it('Should keep its listeners across loads', () => {
    const { service, listener } = setup();
    service.load();
    service.transition('execute');

    service.event('go');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
